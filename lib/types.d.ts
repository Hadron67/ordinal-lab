export type OrdinalExpression =
    | {type: "number", value: number}
    | {type: "symbol", value: string}
    | {type: "omega"}
    | {type: "plus", subexpressions: OrdinalExpression[]}
    | {type: "times", subexpressions: OrdinalExpression[]}
    | {type: "power", base: OrdinalExpression, power: OrdinalExpression}
    | VeblenFunction
    | {type: "y-sequence", data: YSequence}
;

export interface VeblenFunction {
    type: "veblen";
    args: ArrayOrdinal;
}

export interface ArrayOrdinal {
    positionalArgs: OrdinalExpression[];
    kwArgs: [ArrayOrdinal, OrdinalExpression][];
}

export interface YSequence {
    base: OrdinalExpression;
    data: number[];
}
