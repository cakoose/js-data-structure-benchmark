'use strict';

import * as Benchmark from 'benchmark';
import * as os from 'os';
import * as argparse from 'argparse';
import * as crypto from 'crypto';

import * as immutableJs from 'immutable';
const functionalRedBlackTree = require('functional-red-black-tree');

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

    console.log('-------------------------------------------------------------');
    console.log('Map, remove key then add it back');
    console.log();

    for (const mapSize of [10, 100, 1000, 10000]) {
        const suite = createSuite(test, 1, `Map size: ${mapSize}`);

        const initialKeys: Array<string> = [];
        for (let i = 0; i < mapSize; i++) {
            // TODO: Deterministic PRNG for repeatable results.
            initialKeys.push(crypto.randomBytes(9).toString('base64'));
        }

        {
            const map: {[key: string]: number} = {};
            for (let key of initialKeys) {
                map[key] = 1;
            }
            let keyI = 0;
            suite.add('JS Object', () => {
                const key = initialKeys[keyI];
                keyI = keyI + 1;
                if (keyI === initialKeys.length) keyI = 0;
                delete map[key];
                map[key] = 1;
            });
        }

        {
            const map = new Map();
            for (let key of initialKeys) {
                map.set(key, 1);
            }
            let keyI = 0;
            suite.add('JS Map', () => {
                const key = initialKeys[keyI];
                keyI = keyI + 1;
                if (keyI === initialKeys.length) keyI = 0;
                map.delete(key);
                map.set(key, 1);
            });
        }

        {
            let map = immutableJs.Map();
            for (let key of initialKeys) {
                map = map.set(key, 1);
            }
            let keyI = 0;
            suite.add('ImmutableJS Map', () => {
                const key = initialKeys[keyI];
                keyI = keyI + 1;
                if (keyI === initialKeys.length) keyI = 0;
                map = map.delete(key);
                map = map.set(key, 1);
            });
        }

        {
            let map = functionalRedBlackTree();
            for (let key of initialKeys) {
                map = map.insert(key, 1);
            }
            let keyI = 0;
            suite.add('functional-red-black-tree', () => {
                const key = initialKeys[keyI];
                keyI = keyI + 1;
                if (keyI === initialKeys.length) keyI = 0;
                map = map.remove(key);
                map = map.insert(key, 1);
            });
        }

        suite.run();
    }
    console.log();

    console.log('-------------------------------------------------------------');
    console.log('Map batch, for N random keys, remove then add it back');
    console.log();

    for (const mapSize of [10, 100, 1000, 10000]) {
        for (const changes of [2, 10, 50]) {
            const suite = createSuite(test, changes, `Map size: ${mapSize}, N: ${changes}`);

            const initialKeys: Array<string> = [];
            for (let i = 0; i < mapSize; i++) {
                // TODO: Deterministic PRNG for repeatable results.
                initialKeys.push(crypto.randomBytes(9).toString('base64'));
            }

            {
                const map: {[key: string]: number} = {};
                for (let key of initialKeys) {
                    map[key] = 1;
                }
                let keyI = 0;
                suite.add('JS Object', () => {
                    for (let i = 0; i < changes; i++) {
                        const key = initialKeys[keyI];
                        keyI = keyI + 1;
                        if (keyI === initialKeys.length) keyI = 0;
                        delete map[key];
                        map[key] = 1;
                    }
                });
            }

            {
                const map = new Map();
                for (let key of initialKeys) {
                    map.set(key, 1);
                }
                let keyI = 0;
                suite.add('JS Map', () => {
                    for (let i = 0; i < changes; i++) {
                        const key = initialKeys[keyI];
                        keyI = keyI + 1;
                        if (keyI === initialKeys.length) keyI = 0;
                        map.delete(key);
                        map.set(key, 1);
                    }
                });
            }

            {
                let map = immutableJs.Map();
                for (let key of initialKeys) {
                    map = map.set(key, 1);
                }
                let keyI = 0;
                suite.add('ImmutableJS Map', () => {
                    map.withMutations(() => {
                        for (let i = 0; i < changes; i++) {
                            const key = initialKeys[keyI];
                            keyI = keyI + 1;
                            if (keyI === initialKeys.length) keyI = 0;
                            map = map.delete(key);
                            map = map.set(key, 1);
                        }
                    })
                });
            }

            suite.run();
        }
    }
    console.log();
}

// Has an interface similar to Benchmark.Suite, but just runs the code twice.
// We swap this in when we just want to test that the code works without running
// the full benchmark.
class TestSuite {
    private name: string;
    private readonly fns: Array<[string, () => void]>;
    constructor(name: string) {
        this.name = name;
        this.fns = [];
    }
    add(name: string, fn: () => void) {
        this.fns.push([name, fn]);
    }
    run() {
        for (const [name, fn] of this.fns) {
            console.log(name);
            fn();
            fn();
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
    console.log(`OpenSSL  ${process.versions.openssl}`);
    console.log(`OS       ${os.platform()}, ${os.release()}`);
    console.log(`NPM `);
    for (const pkg of ['immutable', 'immer', 'crio', 'seamless-immutable', 'functional-red-black-tree']) {
        const version = require(`${pkg}/package.json`).version;
        console.log(`    ${pkg} ${version}`);
    }
}

const NS_PAD = '            ';

function leftPad(s: string) {
    if (s.length > NS_PAD.length) {
        return s;
    }
    return (NS_PAD + s).slice(-NS_PAD.length);
}

function createSuite(test: boolean, numOperations: number, name: string) {
    if (test) {
        return new TestSuite(name);
    }
    return new Benchmark.Suite(name, {
        onStart() {
            console.log(name);
        },
        onCycle(evt: Benchmark.Event) {
            const target = (evt.target as any);
            const ns = Math.round(target.stats.mean * 1_000_000_000);
            const nsPerOperation = ns / numOperations;
            console.log(`${leftPad(nsPerOperation.toFixed(2))}  ${target.name}`);
        },
        onError(evt: Benchmark.Event) {
            throw (evt.target as any).error;
        },
        onAbort() {
            throw new Error('aborted benchmark suite');
        },
    });
}

type Filter = {
    include: boolean,
    regex: RegExp,
}

function parseArgs(progName: string, args: Array<string>) {
    const parser = new argparse.ArgumentParser({
        prog: progName,
        addHelp: true,
        description: 'JS persistent data structure benchmark',
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

    parser.addArgument('--include', {
        nargs: '*',
        action: (makeFilterAction(true) as any),
        help: "Regex of algorithms to include",
    });
    parser.addArgument('--exclude', {
        nargs: '*',
        action: (makeFilterAction(false) as any),
        help: "Regex of algorithms to exclude",
    });
    parser.addArgument('--test', {
        defaultValue: false,
        action: 'storeTrue',
        help: "Just test that the benchmarks work",
    });
    const parsed = parser.parseArgs(args);
    return {
        filters,
        test: parsed.test,
    };
}

if (require.main === module) {
    mainAsync(process.argv[1], process.argv.slice(2))
        .catch(err => { console.error(err); });
}
