# Carmen Documentation

Some incomplete notes about the Carmen codebase.

## Terminology

* Cache: an object that quickly loads sharded data from JSON or protobuf files
* Source: a Carmen source, such as S3, MBTiles, or memory

## Source structure

```
.
├── lib
│   ├── indexer
│   ├── pure
│   └── util
├── scripts
├── bench
└── test
```

| file/directory | description                                             |
|----------------|---------------------------------------------------------|
| lib            | operations that are exposed in the public ui and do i/o |
| lib/indexer    | TODO                                                    |
| lib/util       | algorithmically simple utilities                        |
| lib/pure       | pure algorithms                                         |
| scripts        | common tasks, runnable from the command line            |
| test           | tests                                                   |
| bench          | bench...es?                                             |
