import * as Benchmark from 'benchmark';
import * as os from 'os';
import * as argparse from 'argparse';
import * as crypto from 'crypto';

import * as assoc from "@thi.ng/associative";
import SortedBTree from 'sorted-btree';
import AVLTree from 'avl';
const redisSortedSet = require('redis-sorted-set');
const functionalRedBlackTree = require('functional-red-black-tree');
const immutableSorted = require('immutable-sorted');
const goneillBptree = require('goneill-b+tree');
const collectionsJsSortedMap = require('collections/sorted-map');

async function mainAsync(progName: string, args: Array<string>) {
    const {filters, test} = parseArgs(progName, args);
    const passesFilter = (name: string) => {
        if (filters.length === 0) {
            return true;
        }
        for (const filter of filters) {
            if (filter.regex.test(name)) {
                return filter.include;
            }
        }
        // If the first filter is an '--include', then something that matches no
        // filters will be excluded.  If the first filter is an '--exclude', then
        // something that matches no filters will be included.
        return !filters[0].include;
    };

    printSystemInformation();
    console.log();
    console.log("Reported value is \"ns per add+remove operation\".");
    console.log("Reported value is the mean of multiple test samples.");
    console.log();

    console.log('-------------------------------------------------------------');
    console.log('Remove a key then add a key.');
    console.log();

    for (const mapSize of [10, 1000, 100000]) {
        const suite = new Suite(`Map size: ${mapSize}`, 1, passesFilter);

        const keys: Array<string> = [];
        const numKeys = mapSize * 3;
        for (let i = 0; i < numKeys; i++) {
            // TODO: Deterministic PRNG for repeatable results.
            keys.push(crypto.randomBytes(9).toString('base64'));
        }

        {
            const map = new Map();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('JS Map (unsorted baseline)', () => {
                map.delete(keys[removeI++]);
                map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const noDuplicates = true;
            const map = new AVLTree(undefined, noDuplicates);
            for (let i = 0; i < mapSize; i++) {
                map.insert(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('avl', () => {
                map.remove(keys[removeI++]);
                map.insert(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        for (const order of [16, 8]) {
            const map = new goneillBptree(order);
            for (let i = 0; i < mapSize; i++) {
                map.insert(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add(`goneill-b+tree order=${order}`, () => {
                map.remove(keys[removeI++]);
                map.insert(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            let map = functionalRedBlackTree();
            for (let i = 0; i < mapSize; i++) {
                map = map.insert(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('functional-red-black-tree [persistent]', () => {
                map = map.remove(keys[removeI++]);
                map = map.insert(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const map = new SortedBTree();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('sorted-btree, in-place', () => {
                map.delete(keys[removeI++]);
                map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            let map = new SortedBTree();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('sorted-btree [persistent]', () => {
                map = map.without(keys[removeI++]);
                map = map.with(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const map = new assoc.SortedMap();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('thi.ng/associative SortedMap', () => {
                map.delete(keys[removeI++]);
                map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const map = new redisSortedSet();
            for (let i = 0; i < mapSize; i++) {
                map.add(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('redis-sorted-set', () => {
                map.rem(keys[removeI++]);
                map.add(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const map = immutableSorted.SortedMap().asMutable();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('immutable-sorted, in-place', () => {
                map.delete(keys[removeI++]);
                map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            let map = immutableSorted.SortedMap();
            map.withMutations((map: any) => {
                for (let i = 0; i < mapSize; i++) {
                    map.set(keys[i], 1);
                }
            });
            let removeI = 0;
            let addI = mapSize;
            suite.add('immutable-sorted [persistent]', () => {
                map = map.delete(keys[removeI++]);
                map = map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        {
            const map = new collectionsJsSortedMap();
            for (let i = 0; i < mapSize; i++) {
                map.set(keys[i], 1);
            }
            let removeI = 0;
            let addI = mapSize;
            suite.add('collections.js SortedMap', () => {
                map.delete(keys[removeI++]);
                map.set(keys[addI++], 1);
                if (addI === keys.length) addI = 0;
                if (removeI === keys.length) removeI = 0;
            });
        }

        suite.run(test);
    }
    console.log();
}

// Has an interface similar to Benchmark.Suite, but just runs the code twice.
// We swap this in when we just want to test that the code works without running
// the full benchmark.
class Suite {
    private readonly fns: Array<[string, () => void]>;
    constructor(private name: string, private numOperations: number, private passesFilter: (testName: string) => boolean) {
        this.fns = [];
    }
    add(name: string, fn: () => void) {
        if (this.passesFilter(name)) {
            this.fns.push([name, fn]);
        }
    }
    run(test: boolean) {
        if (test) {
            for (const [name, fn] of this.fns) {
                console.log(name);
                fn();
                fn();
            }
        } else {
            const outerThis = this;
            const benchmarkSuite = new Benchmark.Suite(this.name, {
                onStart() {
                    console.log(this.name);
                },
                onCycle(evt: Benchmark.Event) {
                    const target = (evt.target as any);
                    const ns = Math.round(target.stats.mean * 1_000_000_000);
                    const nsPerOperation = ns / outerThis.numOperations;
                    const rmeString = `±${target.stats.rme.toFixed(0).padStart(2)}%`;
                    console.log(`${Math.round(nsPerOperation).toString().padStart(8, ' ')} ${rmeString}  ${target.name}`);
                },
                onError(evt: Benchmark.Event) {
                    throw (evt.target as any).error;
                },
                onAbort() {
                    throw new Error('aborted benchmark suite');
                },
            });
            for (const [name, fn] of this.fns) {
                benchmarkSuite.add(name, fn);
            }
            benchmarkSuite.run();
        }
    }
}

function printSystemInformation() {
    const cpuCountsByModel = new Map();
    for (const cpu of os.cpus()) {
        if (cpuCountsByModel.has(cpu.model)) {
            cpuCountsByModel.set(cpu.model, cpuCountsByModel.get(cpu.model) + 1);
        } else {
            cpuCountsByModel.set(cpu.model, 1);
        }
    }
    for (const [model, count] of cpuCountsByModel) {
        console.log(`CPU      ${count}x ${model}`);
    }
    console.log(`Node     ${process.versions.node}`);
    console.log(`V8       ${process.versions.v8}`);
    console.log(`OS       ${os.platform()}, ${os.release()}`);
    console.log(`NPM `);
    for (const pkg of [
        'avl',
        'collections',
        'functional-red-black-tree',
        'immutable',
        'immutable-sorted',
        'redis-sorted-set',
        'sorted-btree',
        '@thi.ng/associative',
    ]) {
        const version = require(`${pkg}/package.json`).version;
        console.log(`    ${pkg} ${version}`);
    }
}

type Filter = {
    include: boolean,
    regex: RegExp,
}

function parseArgs(progName: string, args: Array<string>) {
    const parser = new argparse.ArgumentParser({
        prog: progName,
        add_help: true,
        description: 'JS sorted map benchmark',
    });
    const filters: Array<Filter> = [];
    const makeFilterAction = (include: boolean) => {
        class FilterAction extends argparse.Action {
            call(parser: any, namespace: any, values: Array<string>, optionString: any) {
                console.log('action', JSON.stringify({values, optionString, dest: this.dest}));
                let regex;
                try {
                    regex = new RegExp(values[0]);
                } catch (err) {
                    console.log(`Error: invalid regular expression: ${JSON.stringify(args[0])}: ${err}`);
                    throw process.exit(1);
                }
                filters.push({include, regex});
            }
        }
        return FilterAction;
    };

    parser.add_argument('--include', {
        nargs: '*',
        action: (makeFilterAction(true) as any),
        help: "Regex of algorithms to include",
    });
    parser.add_argument('--exclude', {
        nargs: '*',
        action: (makeFilterAction(false) as any),
        help: "Regex of algorithms to exclude",
    });
    parser.add_argument('--test', {
        default: false,
        action: 'store_true',
        help: "Just test that the benchmarks work",
    });
    const parsed = parser.parse_args(args);
    return {
        filters,
        test: parsed.test,
    };
}

if (require.main === module) {
    mainAsync(process.argv[1], process.argv.slice(2))
        .catch(err => { console.error(err); });
}
