# JS Data Structure Benchmark

Work in progress.  Do not trust these results.

Setup: `yarn install --frozen-lockfile`

Run: `yarn run bench`

## Excluded Packages

btreejs, because it's buggy.
- https://github.com/dcodeIO/btree.js/issues/5
- Got a stack overflow when testing with 1000 elements.
