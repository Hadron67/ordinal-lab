import { compare, foldAllNestings, foundamentalSequence, maximizeOne, OMEGA, stringify } from "./ordinals.js";

function ordinalTest() {
    // const f = foldAllNestings({prev: null, data: new Power(OMEGA, new Plus([OMEGA, new Power(OMEGA, new Plus([OMEGA, new Power(OMEGA, new Power(OMEGA, new Power(OMEGA, OMEGA)))]))]))});
    // const f1 = foldAllNestings({
    //     type: 'power',
    //     base: OMEGA,
    //     power: {type: 'plus', subexpressions: [
    //         OMEGA,
    //         {type: 'power', base: OMEGA, power: {type: 'plus', subexpressions: [
    //             OMEGA,
    //             {type: 'power', base: OMEGA, power: {type: 'power', base: OMEGA, power: OMEGA}}
    //         ]}}
    //     ]}
    // });
    const f = foldAllNestings({type: 'plus', subexpressions: [{type: 'power', base: OMEGA, power: {type: 'power', base: OMEGA, power: OMEGA}}, 1]});
    console.log(stringify(f));
}

ordinalTest();
