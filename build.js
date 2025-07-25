import { watch, build } from 'rolldown';

/**
 * @param {string[]} cmd
 */
async function run(cmd) {
    /** @type {import('rolldown').BuildOptions} */
    const opt = {
        output: {
            sourcemap: true,
            file: 'dist/main.js',
            format: 'iife',
        },
        input: {
            mainFiles: 'src/main.ts',
        },
    };
    if (cmd[0] === 'watch') {
        watch(opt);
    } else {
        build(opt);
    }
}

run(process.argv.slice(2));
