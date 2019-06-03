# How Carmen works

A user searches for

> West Lake View Rd Englewood

How does the Carmen geocoder come up with its results in a forward geocode?

For the purpose of this example, we will assume the Carmen geocoder is working with the following indexes:

    01 country
    02 region
    03 place
    04 street

## 0. Indexing

Carmen has several different data structures used to facilitate a forward geocode. They are:

### The fuzzy phrase store

This structure is provided by the `fuzzy-phrase` library, and contains a representation of every indexed phrase (standardized and normalized feature label) in the index, and maps each one to a unique phrase ID.

### The grid store

This structure is provided by the `carmen-core` library. It maps from a phrase ID as provided by `fuzzy-phrase`, along with language metadata, to a list of the IDs of all the features that phrase describes along with their approximate spatial locations.

### The feature table

This structure maps from feature IDs and locations to full feature metadata and geometry.

### Vector tiles

This structure holds the geometries of all features in the index in Mapbox vector tile format, and is used in forward geocodes for determining the geospatial context of features.

### How indexing occurs

The heavy lifting in Carmen occurs when indexes are generated. As an index is generated for a datasource, Carmen tokenizes each label the feature has into distinct terms. For example, for a street feature:

    "West Lake View Rd" => ["west", "lake", "view", "rd"]

If the feature has multiple valid names, or names in multiple languages, it might have multiple labels, all of which will be processed this way.

Each term in the dataset is tallied, generating a frequency table which can be used to determine the relative importance of terms against each other. In this example, because `west` and `rd` are very common terms while `lake` and `view` are comparatively less common the following weights might be assigned:

    west lake view rd
    0.2  0.5  0.2  0.1

The indexer then generates all possible subqueries that might match this feature:

    0.2 west
    0.7 west lake
    0.9 west lake view
    1.0 west lake view rd
    0.5 lake
    0.7 lake view
    0.8 lake view rd
    0.2 view
    0.3 view rd
    0.1 rd

It drops any of the subqueries below a threshold (e.g. 0.4). This will also save bloating our index for phrases like `rd`:

    0.5 lake
    0.7 west lake
    0.7 lake view
    0.8 lake view rd
    0.9 west lake view
    1.0 west lake view rd

We will also generate geospatial information about each feature. The specific information we capture includes:

| field                | bits     | notes |
|----------------------|----------|-------|
| x                    | 14 bits  | the X tile coordinate of the feature |
| y                    | 14 bits  | the Y tile coordinate of the feature |
| feature id           | 20 bits  |  |
| phrase relev         |  2 bits  | (0 1 2 3 => 0.4, 0.6, 0.8, 1) -- how much of the original phrase this version (which may be missing words) represents |
| score                |  3 bits  | (0 1 2 3 4 5 6 7) -- how globally salient this feature is |
| source_phrase_hash   |  8 bits  | a hash to determine which pre-normalization phrase from this feature corresponds to this post-normalization phrase |

Once we have all the phrases and all the grids, we can insert each phrase into the fuzzy-phrase structure, and determine its phrase ID. For each phrase ID, we can then insert that ID along with all of the corresponding grids for that feature.


    [ID of lake]      => [ grid, grid, grid, grid ... ]
    [ID of west lake] => [ grid, grid, grid, grid ... ]

This is done for both our `01 place` and `02 street` indexes. Now we're ready to search.

## 1. Phrasematch

Okay, so what happens at runtime when a user searches? We start by tokenizing it. We then ask the fuzzy-phrase store for each index "are there any subsequences of tokens in this query that correspond to phrases you know about?" Each index can then report if it contains any feature containing, for example, "west lake", or "englewood". `fuzzy-phrase` contains a graph structure that makes this lookup efficient, and it can also detect if there are phrases that are similar in spelling to the query, even if they aren't exact matches. Additionally, it can determine of a token subsequence at the end of the query might form the *start* of a phrase it knows about, even if it's not the whole thing, to allow for autocomplete matches.

For each result, we end up with a phrase ID for each match (or a range of IDs, in the case of prefix matches), as well as a bitmask representing which tokens from the original query the result matches.

For our query of:

> West Lake View Englewood USA

We might return matches like:

    street
    ------
    52  west lake view   11100
    51  west lake        11000
    30  lake view        01100
    49  west             10000
    29  lake             01000
    59  view             00100
    14  englewood        00010

    place
    ------
    29 west             10000
    24 lake             01000
    12 englewood        00010

    country
    ------
    18 west             10000
    11 usa              00001

By assigning a bitmask to each subquery representing the positions of the input query it represents we can evaluate all the permutations that *could* be "stacked" to match the input query more completely. We can also calculate a *potential* max relevance score that would result from each permutation if the features matched by these subqueries do indeed stack spatially. Examples:

    52 west lake view   11100 street
    12 englewood        00010 place
    11 usa              00001 country

    potential relev 5/5 query terms = 1

    14 englewood        00010 street
    29 west             10000 place
    11 usa              00001 country

    potential relev 3/5 query terms = 0.6

    etc.

Now we're ready to use the spatial properties of our indexes to see if these textual matches actually line up in space.

## 2. Spatial matching

To make sense of the "result soup" from step 1 -- sometimes thousands of potential resulting features match the same text -- the X and Y coordinates in the grid store are used to determine which results overlap in geographic space. This is the `grid` store, which maps phrases to individual feature IDs and their respective zxy coordinates.

    04 street
    ................
    ............x... <== englewood st
    ................
    ...x............
    .......x........ <== west lake view rd
    .........x......
    ................
    ................
    .x..............

    03 place
    ................
    ................
    ................
    .......xx.......
    ......xxxxxx.... <== englewood
    ........xx......
    x...............
    xx..............
    xxxx............ <== west town

Features which overlap in the grid store are candidates to have their subqueries combined. Non-overlapping features are still considered as potential final results, but have no partnering features to combine scores with, leading to a lower total relevance.

    52 west lake view   11100 street
    12 englewood        00010 place
    11 usa              00001 country

    All three features stack, relev = 1

    14 englewood        00010 street
    29 west             10000 place
    11 usa              00001 country

    Englewood St does not overlap others, relev = 0.2

The stack of subqueries has has a score of 1.0 if,

1. all query terms are accounted for by features with 1.0 relev in the grid index,
2. no two features are from the same index,
3. no two subqueries have overlapping bitmasks.

## 3. Verify, interpolate

Once we've done the stacking for results from each index, we combine the results from all of our stacking operations together and choose the best ones. We then fetch detailed feature metadata for each from our feature store, fill in any missing context elements using our vector tiles (if, for example, the query doesn't mention the country, we'll look it up). We also confirm that any user-submitted filters (e.g., bounding box filters) for the feature accommodate each result, and perform additional calculations as needed. For example:
* if a geocoding index support *address interpolation*, an initial query token that might represent a housenumber like `350` can be used to interpolate a point position along the line geometry of the matching feature
* if an index supports *routable points* and the user has requested them, we'll calculate the nearest point on the feature's street to the feature centerpoint
etc.

## 4. Challenging cases

Most challenging cases are solvable but stress performance/optimization assumptions in the Carmen codebase.

### Continuity of feature hierarchy

    5th st new york

The user intends to match 5th st in New York City with this query. She may, instead, receive equally relevant results that match a 5th st in Albany or any other 5th st in the state of New York. To address this case, Carmen introduces a slight penalty for "index gaps" when query matching. Consider the two following query matches:

    04 street   5th st    1100
    03 place    new york  0011

    04 street   5th st    1100
    02 region   new york  0011

Based on score and subquery bitmask both should have a relevance of 1.0. However, because there is a "gap" in the index hierarchy for the second match it receives an extremely small penalty (0.01) -- one that would not affect its standing amongst other scores other than a perfect tie.

Carmen thus *prefers* queries that contain contiguous hierarchy over ones that do not. This works:

    seattle usa => 0.99

But this works better:

    seattle washington => 1.00

## 5. Carmen is more complex

Unfortunately, the Carmen codebase is more complex than this explanation.

1. There's more code cleanup, organization, and documentation to do.
2. Much of the performance-critical work now lives outside of Carmen, in `fuzzy-phrase` and `carmen-core`, so that it can be implemented in Rust, and optionally run in a multi-threaded way.
3. The use of integer hashes, bitmasks, and other performance optimizations (inlined code rather than function calls) makes it challenging to identify the semantic equivalents in the middle of a geocode.

