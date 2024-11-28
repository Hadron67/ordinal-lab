/** @import { AdmissibleOmega, Expression } from './types/ordinal.js' */

import { compare, compareExpression, evaluate, evaluateFoundamentalSequence, foldAllNestings, foundamentalSequenceFunction, maximizeOne, OLO, OMEGA, stringify } from "./ordinals.js";
import { lexicographicalCompareNumbers } from "./utils.js";
import { y0Montagne, expandY0 } from "./0y.js";

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
            2,
        ]}})[0];
    }, {type: 'ocf', variant: 'b', subscript: omega1, arg: {type: 'lambda', args: [1], body: {type: 'plus', subexpressions: [
        omega1,
        {type: 'ocf', variant: 'b', subscript: omega1, arg: {type: 'slot', id: 1}},
    ]}, iterations: {type: 'slot', id: 0}, appliedTo: 0}});

    testExpression('fs test 3', () => {
        const fs0 = foundamentalSequenceFunction({type: 'power', base: {type: 'ocf', variant: 'm', subscript: omega1, arg: 1}, power: 2});
        return evaluateFoundamentalSequence(fs0, 1);
    }, {type: 'times', subexpressions: [
        {type: 'ocf', variant: 'm', subscript: omega1, arg: 1},
        {type: 'ocf', variant: 'm', subscript: omega1, arg: 0},
    ]});

    testExpression('evaluate omega^Omega', () => {
        return evaluate({type: 'power', base: OMEGA, power: omega1});
    }, omega1);
    testExpression('evaluate omega^Omega^2', () => {
        return evaluate({type: 'power', base: OMEGA, power: {type: 'power', base: omega1, power: 2}});
    }, {type: 'power', base: omega1, power: omega1});
    testExpression('evaluate omega^Omega^Omega', () => {
        return evaluate({type: 'power', base: OMEGA, power: {type: 'power', base: omega1, power: omega1}});
    }, {type: 'power', base: omega1, power: {type: 'power', base: omega1, power: omega1}});
}

/**
 * @param {number[]} input
 * @param {number} n
 * @param {number[]} expected
 */
function testY0(input, n, expected) {
    const montagne = y0Montagne(input);
    const expander = expandY0(montagne);
    if (expander) {
        for (let i = 0; i < n; i++) {
            expander();
        }
        const actual = expander();
        if (actual === null) {
            console.log(`TEST FAILED on 0-Y sequence ${input.join(',')}, expansion failed`);
            return;
        }
        if (lexicographicalCompareNumbers(expected, actual) !== 0) {
            console.log(`TEST FAILED on 0-Y sequence ${input.join(',')}`);
            console.log(`    Expected: ${expected.join(',')}`);
            console.log(`    Actual:   ${actual.join(',')}`);
        }
    } else console.log(`TEST FAILED on 0-Y sequence ${input.join(',')}, expansion failed`);
}

function y0Tests() {
    testY0([1, 3], 3, [1, 2, 3, 4]);
    testY0([1, 3, 6, 5, 8, 7, 9, 11, 13, 9], 3, [1,3,6,5,8,7,9,11,13,8,10,13]);
    testY0([1, 4, 5, 4], 4, [1, 4, 5, 3, 7, 8, 6]);
}

ordinalTest();
y0Tests();
