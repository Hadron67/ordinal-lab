import { compare, foundamentalSequence, maximizeOne, OMEGA, Plus, Power, Times } from "./ordinals.js";

function ordinalTest() {
    // console.log(compare(new Power(OMEGA, new Plus([OMEGA, 1])), new Times([new Power(OMEGA, OMEGA), 101])));
    console.log(compare(new Power(OMEGA, OMEGA), new Power(OMEGA, new Plus([OMEGA, 1]))));
    console.log(compare(new Power(OMEGA, new Power(OMEGA, OMEGA)), new Power(OMEGA, new Plus([OMEGA, 1]))));
    // console.log(compare({
    //     type: 'power',
    //     base: OMEGA,
    //     power: OMEGA
    // }, {
    //     type: 'power',
    //     base: OMEGA,
    //     power: 2
    // }));
    // console.log(maximizeOne({
    //     type: 'power',
    //     base: OMEGA,
    //     power: {
    //         type: 'power',
    //         base: OMEGA,
    //         power: {
    //             type: 'power',
    //             base: OMEGA,
    //             power: {
    //                 type: 'power',
    //                 base: OMEGA,
    //                 power: OMEGA
    //             }
    //         }
    //     }
    // }, 2, { postEpsilonOneNotation: 'veblen' }));
}

ordinalTest();
