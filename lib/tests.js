import { foundamentalSequence } from "./ordinals";

function ordinalTest() {
    foundamentalSequence({type: 'power', base: {type: 'omega'}, power: {type: 'number', value: 3}}, 3);
}
