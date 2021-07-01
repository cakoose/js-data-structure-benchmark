# JS Sorted Map Benchmark

Work in progress.  Do not trust these results.

Setup: `yarn install`

Run: `yarn run bench`

## Results

2021-01-05:
- MacBook Pro 16" 2019: [Node 14.15.0](results/2021-01-05-Node-14.15.0-MacBook-Pro-16-2019.txt)

2020-11-08:
- MacBook Pro 13" 2016: [Node 14.15.0](results/2020-11-08-Node-14.15.0-MacBook-Pro-13-2016.txt)

## Intentionally excluded

[btreejs](https://www.npmjs.com/package/btreejs), because it's buggy.
- https://github.com/dcodeIO/btree.js/issues/5
- Got a stack overflow when testing with 1000 elements.

[bplustree](https://www.npmjs.com/package/bplustree), because it's really slow
- The benchmark run for 100k is a linear slowdown compared to 1k entries.
