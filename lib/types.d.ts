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
    args: VeblenFunctionArgs;
}

export interface VeblenFunctionArgs {
    positionalArgs: OrdinalExpression[];
    kwArgs: [VeblenFunctionArgs, OrdinalExpression][];
}

export interface YSequence {
    base: OrdinalExpression;
    data: number[];
}
