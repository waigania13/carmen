
### handling non-latin text

Carmen employs a version of the `unidecode` project to normalize all input strings to ASCII prior to being murmur hashed into a phrase (see above). This is useful for removing accents from Latin alphabets: `Köln` and `Koln` match one another post-unidecode. It also provides some limited transliteration capabilities across wider cultural gaps. For instance, `深圳` (Shenzhen) unidecodes to `Shen Zhen`.

However, transliteration increases the potential for collisions between queries. One example is the Canadian province `Alberta`. Its Japanese name is `アルバータ州` which unidecode transforms into `arubataZhou` which has the potential to match queries for `Aruba`.

For this reason, termops examines whether a given piece of text contains characters from the CJK (Chinese/Japanese/Korean) unicode blocks. If the text consists exclusively of such characters, a `z` is prepended to it. If there are any non-CJK characters, an `x` is prepended. This effectively isolates all-CJK tokens from everything else (including tokens that contain CJK characters alongside non-CJK characters).

For clarity and simplicity, the above examples do not include these prepended chars. But in practice a query for `seattle washington` will be tokenized to `xseattle`, `xwashington` and `xseattle washington`.

