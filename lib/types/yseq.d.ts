import { LList } from "./app";
import type { OrdinalExpanderItem, OrdinalMenu } from '../enumerator';

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
}
