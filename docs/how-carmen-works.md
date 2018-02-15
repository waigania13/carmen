# How carmen works

A user searches for

> West Lake View Rd Englewood

How does an appropriately indexed carmen geocoder come up with its results?

For the purpose of this example, we will assume the carmen geocoder is working with the following indexes:

    01 country
    02 region
    03 place
    04 street

## 0. Indexing

The heavy lifting in carmen occurs when indexes are generated. As an index is generated for a datasource carmen tokenizes the text into distinct terms. For example, for a street feature:

    "West Lake View Rd" => ["west", "lake", "view", "rd"]

Each term in the dataset is tallied, generating a frequency index which can be used to determine the relative importance of terms against each other. In this example, because `west` and `rd` are very common terms while `lake` and `view` are comparatively less common the following weights might be assigned:

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

Finally the indexer generates degenerates for all these subqueries, making it possible to match using typeahead, like this:

    0.5 l
    0.5 la
    0.5 lak
    0.5 lake
    0.7 w
    0.7 we
    0.7 wes
    0.7 west
    0.7 west l
    0.7 west la
    ...

Finally, the indexer stores the results of all this using `phrase_id` in the `grid` index:

    lake      => [ grid, grid, grid, grid ... ]
    west lake => [ grid, grid, grid, grid ... ]

The `phrase_id` uses the final bit to mark whether the phrase is a "degen" or "complete". e.g

    west lak          0
    west lake         1

Grids encode the following information for each XYZ `x,y` coordinate covered by a feature geometry:

    x            14 bits
    y            14 bits
    feature id   20 bits  (previously 25)
    phrase relev  2 bits  (0 1 2 3 => 0.4, 0.6, 0.8, 1)
    score         3 bits  (0 1 2 3 4 5 6 7)

This is done for both our `01 place` and `02 street` indexes. Now we're ready to search.

## 1. Phrasematch

Ok so what happens at runtime when a user searches?

We take the entire query and break it into all the possible subquery permutations. We then lookup all possible matches in all the indexes for all of these permutations:

> West Lake View Englewood USA

Leads to 15 subquery permutations:

    1  west lake view englewood usa
    2  west lake view englewood
    3  lake view englewood usa
    4  west lake view
    5  lake view englewood
    6  view englewood usa
    7  west lake
    8  lake view
    9  view englewood
    10 englewood usa
    11 west
    12 lake
    13 view
    14 englewood
    15 usa

Once phrasematch results are retrieved any subqueries that didn't match any results are eliminated.

    4  west lake view   11100 street
    7  west lake        11000 street
    8  lake view        01100 street
    11 west             10000 street, place, country
    12 lake             01000 street, place
    13 view             00100 street
    14 englewood        00010 street, place
    15 usa              00001 country

By assigning a bitmask to each subquery representing the positions of the input query it represents we can evaluate all the permutations that *could* be "stacked" to match the input query more completely. We can also calculate a *potential* max relevance score that would result from each permutation if the features matched by these subqueries do indeed stack spatially. Examples:

    4  west lake view   11100 street
    14 englewood        00010 place
    15 usa              00001 country

    potential relev 5/5 query terms = 1

    14 englewood        00010 street
    11 west             10000 place
    15 usa              00001 country

    potential relev 3/5 query terms = 0.6

    etc.

Now we're ready to use the spatial properties of our indexes to see if these textual matches actually line up in space.

## 2. Spatial matching

To make sense of the "result soup" from step 1 -- sometimes thousands of potential resulting features match the same text -- the zxy coordinates in the grid index are used to determine which results overlap in geographic space. This is the `grid` index, which maps phrases to individual feature IDs and their respective zxy coordinates.

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

Features which overlap in the grid index are candidates to have their subqueries combined. Non-overlapping features are still considered as potential final results, but have no partnering features to combine scores with, leading to a lower total relev.

    4  west lake view   11100 street
    14 englewood        00010 place
    15 usa              00001 country

    All three features stack, relev = 1

    14 englewood        00010 street
    11 west             10000 place
    15 usa              00001 country

    Englewood St does not overlap others, relev = 0.2

The stack of subqueries has has a score of 1.0 if,

1. all query terms are accounted for by features with 1.0 relev in the grid index,
2. no two features are from the same index,
3. no two subqueries have overlapping bitmasks.

## 3. Verify, interpolate

The `grid` index is fast but not 100% accurate. It answers the question "Do features A + B overlap?" with **No/Maybe** -- leaving open the possibility of false positives. The best results from step 4 are now verified by querying real geometries in vector tiles.

Finally, if a geocoding index support *address interpolation*, an initial query token that might represent a housenumber like `350` can be used to interpolate a point position along the line geometry of the matching feature.

## 4. Challenging cases

Most challenging cases are solvable but stress performance/optimization assumptions in the carmen codebase.

### Continuity of feature hierarchy

    5th st new york

The user intends to match 5th st in New York City with this query. She may, instead, receive equally relevant results that match a 5th st in Albany or any other 5th st in the state of New York. To address this case, carmen introduces a slight penalty for "index gaps" when query matching. Consider the two following query matches:

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

Unfortunately, the carmen codebase is more complex than this explanation.

1. There's more code cleanup, organization, and documentation to do.
2. Indexes are *sharded*, designed for *updates* and hot-swapping with other indexes. This means algorithmic code is sometimes interrupted by lazy loading and other I/O.
3. The use of integer hashes, bitmasks, and other performance optimizations (inlined code rather than function calls) makes it extremely challenging to identify the semantic equivalents in the middle of a geocode.

