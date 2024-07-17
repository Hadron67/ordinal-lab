import type { Evaluator } from "./ordinals";

export interface DisplayOptions {
    showSpecialVeblenFns: boolean;
}

export type PrimitiveExpression = number;
export type Expression = PrimitiveExpression | CompoundExpression;

export type DisplayNotation =
    | number
    | {type: 'mi' | 'mo', value: string}
    | {type: "subscript", expr: DisplayNotation[], subscript: DisplayNotation[]}
    | {type: "superscript", expr: DisplayNotation[], superscript: DisplayNotation[]}
;

export type LinkedListNode<T> = {prev: LinkedListNode<T> | null, data: T};
/**
 * We dont include the parent link in the expression nodes since expressions can have shared children, meaning there could be multiple parents.
 * But certain algorithms do need parent links, that's what `TracedExpression` is used for.
 */
export type TracedExpression = {prev: TracedExpression | null, data: Expression};
export type TracedExpressionWithIndex = {prev: TracedExpressionWithIndex, data: Expression, childIndex: number} | {prev: null, data: Expression};
export type EvaluatorCallback = (ret: Expression, evaluator: Evaluator) => void;

export interface ExpressionMessage {
    apply(expr: Expression, evaluator: Evaluator): void;
}

export interface CompoundExpression {
    stringifyOne(): (string | Expression)[];
    getType(): string;
    compareHead(parent: TracedExpression | null, other: TracedExpression): Ordering;
    toDisplayNotationOne(todo: (Expression | ((stack: DisplayNotation[][]) => void))[], stack: DisplayNotation[][], opt: DisplayOptions): void;
    evaluate2(parent: TracedExpression | null, cb: EvaluatorCallback, evaluator: Evaluator): boolean;
    evaluateUpValue(head: TracedExpression, childIndex: number, cb: EvaluatorCallback, evaluator: Evaluator): boolean;
    getLength(): number;
    getChild(i: number): Expression;
    withChildren(children: Expression[]): CompoundExpression;

    foundamentalSequenceStep(n: number, stack: ((ord: Expression) => Expression)[]): [Expression, boolean];
    compareAsync(other: Expression, cb: (ret: Ordering) => void, exec: (run: () => void) => void): void;
    maximizeAsync(cb: (ret: Expression | null) => void, exec: (run: MaximizerExecutor) => void): void;
}

export interface ExpressionVisitor {
    visit(expr: Expression): void;
}

export type Ordering = 0 | 1 | -1;
export type MaximizerExecutor = (n: number, opt: MaximizerOptions) => void;

export interface VeblenFunction extends NestedArrayExpression {
    type: "veblen";
}

export type NestedArrayCoord = NestedArrayExpression | Expression;
export type NestedArrayTerm = [NestedArrayCoord, Expression];

export interface NestedArrayExpression {
    positional: Expression[];
    kw: [NestedArrayCoord, Expression][];
}

export interface MaximizerOptions {
    postEpsilonOneNotation: 'veblen' | 'bocf';
}
