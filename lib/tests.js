import { compare, foundamentalSequence, OMEGA } from "./ordinals.js";

function ordinalTest() {
    console.log(compare({
        type: 'power',
        base: OMEGA,
        power: {type: 'plus', subexpressions: [OMEGA, 1]}
    }, {
        type: 'times',
        subexpressions: [
            {type: 'power', base: OMEGA, power: OMEGA},
            101
        ]
    }));
    console.log(compare({
        type: 'power',
        base: OMEGA,
        power: OMEGA
    }, {
        type: 'power',
        base: OMEGA,
        power: 2
    }));
}

ordinalTest();
