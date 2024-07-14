export interface DisplayOptions {
    showSpecialVeblenFns: boolean;
}

export type Ordinal = number | CompoundOrdinal;

export type DisplayNotation =
    | number
    | {type: 'mi' | 'mo', value: string}
    | {type: "subscript", expr: DisplayNotation[], subscript: DisplayNotation[]}
    | {type: "superscript", expr: DisplayNotation[], superscript: DisplayNotation[]}
;

export interface CompoundOrdinal {
    foundamentalSequenceStep(n: number, stack: ((ord: Ordinal) => Ordinal)[]): [Ordinal, boolean];
    compareAsync(other: Ordinal, cb: (ret: Ordering) => void, exec: (run: () => void) => void): void;
    maximizeAsync(cb: (ret: Ordinal | null) => void, exec: (run: MaximizerExecutor) => void): void;
    stringifyOne(): (string | Ordinal)[];
    toDisplayNotationOne(todo: (Ordinal | ((stack: DisplayNotation[][]) => void))[], stack: DisplayNotation[][], opt: DisplayOptions): void;
}

export type Ordering = 0 | 1 | -1;
export type MaximizerExecutor = (n: number, opt: MaximizerOptions) => void;

export interface VeblenFunction extends NestedArrayExpression {
    type: "veblen";
}

export type NestedArrayCoord = NestedArrayExpression | Ordinal;
export type NestedArrayTerm = [NestedArrayCoord, Ordinal];

export interface NestedArrayExpression {
    positional: Ordinal[];
    kw: [NestedArrayCoord, Ordinal][];
}

export interface MaximizerOptions {
    postEpsilonOneNotation: 'veblen' | 'bocf';
}
