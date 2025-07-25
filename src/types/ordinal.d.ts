import type { Evaluator } from "../ordinals";
import type { OrdinalExpanderItem } from '../enumerator';
import { LList } from './app';

export interface DisplayOptions {
    showSpecialVeblenFns: boolean;
    simplifiedOCFSubscripts: boolean;
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
    | AdmissibleOmega
    | InaccessibleOrdinal
    | OrdinalCollapsingFn
    | OrdinalLabOrdinal
;

export type ExpressionType = CompoundExpression['type'] | 'number';

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

export interface OrdinalLabOrdinal {
    readonly type: 'olo';
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

export interface AdmissibleOmega {
    readonly type: 'omega-n';
    readonly subscript: Expression;
}

export interface InaccessibleOrdinal {
    readonly type: 'i-n';
    readonly args: Expression[];
}

export type OCFVariant = 'b' | 'm';

export interface OrdinalCollapsingFn {
    readonly type: 'ocf';
    readonly variant: OCFVariant;
    readonly subscript: Expression;
    readonly arg: Expression;
}

/**
 * We dont include the parent link in the expression nodes since expressions can have shared children, meaning there could be multiple parents.
 * But certain algorithms do need parent links, that's what `TracedExpression` is used for.
 */
export type TracedExpression = {prev: TracedExpression | null, data: Expression};
export type TracedExpressionWithIndex = {prev: TracedExpressionWithIndex, data: Expression, childIndex: number} | {prev: null, data: Expression};
export type EvaluatorCallback = (ret: Expression, evaluator: Evaluator) => void;

export type Ordering = 0 | 1 | -1;

export interface VeblenFunction extends NestedArrayExpression {
    readonly type: "veblen";
}

export type NestedArrayCoord = NestedArrayExpression | Expression;
export type NestedArrayTerm = [NestedArrayCoord, Expression];

export interface NestedArrayExpression {
    readonly positional: Expression[];
    readonly kw: [NestedArrayCoord, Expression][];
}

export type DisplayNotation =
    | number
    | DisplayNotation[]
    | {type: 'psi' | 'omega' | 'Omega' | 'right-arrow' | 'alpha' | 'beta' | 'gamma'}
    | {type: 'mo' | 'mi', text: string}
    | {type: 'paren', expr: DisplayNotation}
    | {type: 'sup', expr: DisplayNotation, superscript: DisplayNotation}
    | {type: 'sub', expr: DisplayNotation, subscript: DisplayNotation}
;

export type SpecialChar = 'psi' | 'omega' | 'Omega' | 'right-arrow' | 'alpha' | 'beta' | 'gamma';

export interface Y0MontagneRow {
    readonly data: number[];
    readonly parentPtr: (number | null)[];
}

export interface Y0MontagneImageConfig {
    elemGap: number;
    linkCellHeight: number;
    fontSize: number;
    paddingLeftRight: number;
}

export interface RenderedY0Element extends LList<RenderedY0Element> {
    readonly listItem: HTMLLIElement;
    readonly data: number[];
    readonly montagne: Y0MontagneRow[];
}

export interface OrdinalEnumeratorConfig<T> {
    serialize(): any;
    compare(a: T, b: T): number;
    render(ord: T): Node;
    stringify(a: T): string;
    expander(a: T): (() => T | null) | null;
    predecessor(a: T): T | null;
    parse(str: string): T | null;
    createElement(elem: OrdinalExpanderItem<T>): OrdinalEnumeratorElementManager<T>;
}

export interface OrdinalEnumeratorElementManager<T> {
    render(ordinal: T, isCandidate: boolean): Node;
    serialize(data: any): void;
    deserialize(data: any): void;
    createElement(elem: OrdinalExpanderItem<T>): OrdinalEnumeratorElementManager<T>;
}
