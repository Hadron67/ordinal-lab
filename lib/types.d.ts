export type OrdinalExpression =
    | number
    | {type: "symbol", value: string}
    | {type: "omega"}
    | {type: "plus", subexpressions: OrdinalExpression[]}
    | {type: "times", subexpressions: OrdinalExpression[]}
    | {type: "power", base: OrdinalExpression, power: OrdinalExpression}
    | {type: "omega-n", sub: OrdinalExpression}
    | VeblenFunction
    | {type: "y-sequence", data: YSequence}
;

export type Ordering = 0 | 1 | -1;
export type MaximizerExecutor = (n: number, opt: MaximizerOptions) => void;

export interface VeblenFunction extends NestedArrayExpression {
    type: "veblen";
}

export interface NestedArrayExpression {
    positional: OrdinalExpression[];
    kw: [NestedArrayExpression, OrdinalExpression][];
}

export interface YSequence {
    base: OrdinalExpression;
    data: number[];
}

export interface MaximizerOptions {
    postEpsilonOneNotation: 'veblen' | 'bocf';
}
