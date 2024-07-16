export interface DisplayOptions {
    showSpecialVeblenFns: boolean;
}

export type Expression = number | CompoundExpression;

export type DisplayNotation =
    | number
    | {type: 'mi' | 'mo', value: string}
    | {type: "subscript", expr: DisplayNotation[], subscript: DisplayNotation[]}
    | {type: "superscript", expr: DisplayNotation[], superscript: DisplayNotation[]}
;

export interface CompoundExpression {
    stringifyOne(): (string | Expression)[];
    getType(): string;
    compareHead(other: Expression): Ordering;
    toDisplayNotationOne(todo: (Expression | ((stack: DisplayNotation[][]) => void))[], stack: DisplayNotation[][], opt: DisplayOptions): void;
    evaluate(todo: [Expression, number][]): Expression;
    evaluateUpValue(head: Expression, todo: [Expression, number][]): Expression;
    getLength(): number;
    getChild(i: number): Expression;
    setChild(i: number, expr: Expression): void;
    appendChild(expr: Expression): void;

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
