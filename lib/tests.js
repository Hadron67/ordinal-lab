import { compare, foundamentalSequence, OMEGA, ONE } from "./ordinals.js";

function ordinalTest() {
    console.log(compare({
        type: 'power',
        base: OMEGA,
        power: {type: 'plus', subexpressions: [OMEGA, ONE]}
    }, {
        type: 'times',
        subexpressions: [
            {type: 'power', base: OMEGA, power: OMEGA},
            {type: 'number', value: 101}
        ]
    }));
}

ordinalTest();
