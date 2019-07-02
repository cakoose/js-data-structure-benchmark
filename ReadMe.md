# JS Sorted Map Benchmark

Work in progress.  Do not trust these results.

Setup: `yarn install --frozen-lockfile`

Run: `yarn run bench`

## Results

2020-11-08:
- MacBook Pro 13" 2016: [Node 14.15.0](results/2020-11-08-Node-14.15.0-MacBook-Pro-13-2016.txt)

## Intentionally excluded

btreejs, because it's buggy.
- https://github.com/dcodeIO/btree.js/issues/5
- Got a stack overflow when testing with 1000 elements.
