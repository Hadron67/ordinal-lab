import { compare, foldAllNestings, foundamentalSequence, maximizeOne, OMEGA, Plus, Power, stringify, Times } from "./ordinals.js";

function ordinalTest() {
    const f = foldAllNestings({prev: null, data: new Power(OMEGA, new Plus([OMEGA, new Power(OMEGA, new Plus([OMEGA, 2]))]))});
    console.log(stringify(f));
}

ordinalTest();
