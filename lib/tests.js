/** @import { AdmissibleOmega, Expression } from './types.js' */

import { compare, compareExpression, evaluateFoundamentalSequence, foldAllNestings, foundamentalSequenceFunction, maximizeOne, OLO, OMEGA, stringify } from "./ordinals.js";

/**
 * @param {string} description
 * @param {(() => Expression )| Expression} fn
 * @param {Expression} expected
 */
function testExpression(description, fn, expected) {
    const actual = typeof fn === 'function' ? fn() : fn;
    if (compareExpression(expected, actual) !== 0) {
        console.log(`TEST FAILED on ${description}: `);
        console.log(`    expected: ${stringify(expected)}`);
        console.log(`    actual: ${stringify(actual)}`);
    }
}

function ordinalTest() {
    /** @type {AdmissibleOmega} */
    const omega1 = {type: 'omega-n', subscript: 1};
    testExpression('fs test 1', () => {
        return foundamentalSequenceFunction({type: 'ocf', variant: 'b', subscript: omega1, arg: omega1})[0];
    }, {type: 'lambda', args: [1], body: {type: 'power', base: OMEGA, power: {type: 'slot', id: 1}}, iterations: {type: 'slot', id: 0}, appliedTo: 1});
    testExpression('fs test 2', () => {
        return foundamentalSequenceFunction({type: 'ocf', variant: 'b', subscript: omega1, arg: {type: 'times', subexpressions: [
            omega1,
            2
        ]}})[0];
    }, {type: 'ocf', variant: 'b', subscript: omega1, arg: {type: 'lambda', args: [1], body: {type: 'plus', subexpressions: [
        omega1,
        {type: 'ocf', variant: 'b', subscript: omega1, arg: {type: 'slot', id: 1}}
    ]}, iterations: {type: 'slot', id: 0}, appliedTo: 0}});

    testExpression('fs test 3', () => {
        const fs0 = foundamentalSequenceFunction({type: 'power', base: {type: 'ocf', variant: 'm', subscript: omega1, arg: 1}, power: 2});
        return evaluateFoundamentalSequence(fs0, 1);
    }, {type: 'times', subexpressions: [
        {type: 'ocf', variant: 'm', subscript: omega1, arg: 1},
        {type: 'ocf', variant: 'm', subscript: omega1, arg: 0}
    ]});
}

ordinalTest();
