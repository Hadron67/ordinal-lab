/** @import { CompoundExpression, Expression, Ordering, DisplayNotation, DisplayOptions } from "./types" */

import { compareAsync } from "./ordinals";
import { pushReversed } from "./utils";

const CHAR_UPPER_OMEGA = '\u03A9';
const CHAR_LOWER_PHI = '\u03C6';
const CHAR_LOWER_PSI = '\u03C8';

/**
 * @param {Expression} expr
 * @param {OrdinalCollapsingFn} target
 */
function populateAdmissibleOmegaTarget(expr, target) {
    /** @type {Expression[]} */
    const stack = [expr];
    while (stack.length > 0) {
        /** @type {typeof stack[0]} */
        // @ts-ignore
        const top = stack.pop();
        if (top instanceof AdmissibleOmega) {
            top.target = target;
            stack.push(top.sub);
        } else if (top instanceof OrdinalCollapsingFn) {
            stack.push(top.sub);
            // Dont recurse into the sub-ocf
        } else if (typeof top === 'object') {
            pushReversed(stack, top.getChildren());
        }
    }
}

export class OrdinalCollapsingFn {
    /**
     * @param {Expression} sub
     * @param {Expression} arg
     */
    constructor(sub, arg) {
        /** @type {Expression} */
        this.sub = sub;
        /** @type {Expression} */
        this.arg = arg;
        populateAdmissibleOmegaTarget(arg, this);
    }
}

/** @implements {CompoundExpression} */
export class AdmissibleOmega {
    /**
     * @param {Expression} sub
     * @param {OrdinalCollapsingFn=} target
     */
    constructor(sub, target) {
        /** @type {Expression} */
        this.sub = sub;
        /** @type {OrdinalCollapsingFn | null} */
        this.target = target ?? null;
    }
    /**
     * @param {number} n
     * @param {((ord: Expression) => Expression)[]} stack
     */
    foundamentalSequenceStep(n, stack) {
        if (typeof this.sub === 'object') {
            stack.push(ord => new AdmissibleOmega(ord, this.target));
            return [this.sub, false];
        } else {
            
        }
        throw new Error("Method not implemented.");
    }
    /**
     * @param {CompoundExpression} other
     * @param {(ret: Ordering) => void} cb
     * @param {(run: () => void) => void} exec
     */
    compareAsync(other, cb, exec) {
        if (other instanceof AdmissibleOmega) {
            exec(() => compareAsync(this.sub, other.sub, cb, exec));
        } else {
            // TODO: reflections and stables
            exec(() => cb(1));
        }
    }
    /**
     * @param {(ret: Expression | null) => void} cb
     * @param {(run: import("./types").MaximizerExecutor) => void} exec
     */
    maximizeAsync(cb, exec) {
        throw new Error("Method not implemented.");
    }
    stringifyOne() {
        return ['Omega[', this.sub, ']'];
    }
    /**
     * @param {(Expression | ((stack: DisplayNotation[][]) => void))[]} todo
     * @param {DisplayOptions} opt
     * @param {DisplayNotation[][]} stack
     */
    toDisplayNotationOne(todo, stack, opt) {
        if (this.sub === 0) {
            stack.push([{type: 'mi', value: CHAR_UPPER_OMEGA}]);
        } else if (typeof this.sub === 'number') {
            stack.push([{type: 'subscript', expr: [{type: 'mi', value: CHAR_UPPER_OMEGA}], subscript: [this.sub]}]);
        } else {
            todo.push(stack => {
                /** @type {typeof stack[0]} */
                // @ts-ignore
                const ret = [{type: 'subscript', expr: [{type: 'mi', value: CHAR_UPPER_OMEGA}], subscript: [stack.pop()]}];
                stack.push(ret);
            });
            todo.push(this.sub);
        }
    }
}