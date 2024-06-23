import { OrdinalExpression } from "./types";

export type ComparatorFrame =
    | {type: 0, ordinal1: OrdinalExpression, ordinal2: OrdinalExpression} // initial
    | {type: 1, i: number, ords1: OrdinalExpression[], ords2: OrdinalExpression[], padding: OrdinalExpression} // lexicographical compare
;

export type UpgradeFrame =
    | {type: 0, ordinal: OrdinalExpression} // initial
    | {type: 1, ordinals: OrdinalExpression[], cursor: number, retType: 'plus' | 'times'}
    | {type: 2, base: OrdinalExpression}
;