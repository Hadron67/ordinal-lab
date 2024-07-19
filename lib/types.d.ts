import type { Evaluator } from "./ordinals";

export interface DisplayOptions {
    showSpecialVeblenFns: boolean;
}

export type PrimitiveExpression = number;
export type Expression = PrimitiveExpression | CompoundExpression;
export type CompoundExpression =
    | PlusExpression
    | TimesExpression
    | PowerExpression
    | LambdaExpression
    | Omega
    | Slot
;

export interface ExpressionTypeMap {
    'number': number;
    'plus': PlusExpression;
    'times': TimesExpression;
    'power': PowerExpression;
    'omega': Omega;
    'lambda': LambdaExpression;
    'slot': Slot;
}

export interface PlusExpression {
    readonly type: 'plus';
    readonly subexpressions: Expression[];
}

export interface TimesExpression {
    readonly type: 'times';
    readonly subexpressions: Expression[];
}

export interface PowerExpression {
    readonly type: 'power';
    readonly base: Expression;
    readonly power: Expression;
}

export interface Omega {
    readonly type: 'omega';
}

export interface LambdaExpression {
    readonly type: 'lambda';
    readonly args: number[];
    readonly body: Expression;
    readonly iterations: Expression;
    readonly appliedTo?: Expression;
}

export interface Slot {
    readonly type: 'slot';
    readonly id: number;
}

/**
 * We dont include the parent link in the expression nodes since expressions can have shared children, meaning there could be multiple parents.
 * But certain algorithms do need parent links, that's what `TracedExpression` is used for.
 */
export type TracedExpression = {prev: TracedExpression | null, data: Expression};
export type TracedExpressionWithIndex = {prev: TracedExpressionWithIndex, data: Expression, childIndex: number} | {prev: null, data: Expression};
export type EvaluatorCallback = (ret: Expression, evaluator: Evaluator) => void;

export type Ordering = 0 | 1 | -1;
export type MaximizerExecutor = (n: number, opt: MaximizerOptions) => void;

export interface VeblenFunction extends NestedArrayExpression {
    readonly type: "veblen";
}

export type NestedArrayCoord = NestedArrayExpression | Expression;
export type NestedArrayTerm = [NestedArrayCoord, Expression];

export interface NestedArrayExpression {
    readonly positional: Expression[];
    readonly kw: [NestedArrayCoord, Expression][];
}

export interface MaximizerOptions {
    postEpsilonOneNotation: 'veblen' | 'bocf';
}
