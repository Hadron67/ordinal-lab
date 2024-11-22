import type { DisplayOptions, Expression } from "./types";

export interface OrdinalMarkupConfig {
    ordinal: string;
    clickRepeats: number;
    base: number;
    autoClicker: boolean;
    autoMaximize: boolean;
}

export interface LList<T extends LList<T>> {
    previous?: T;
    next?: T;
}

export interface ExpandedOrdinalRow extends LList<ExpandedOrdinalRow> {
    readonly id: number;
    readonly container: HTMLLIElement;
    readonly expressionContainer: HTMLDivElement;
    readonly ordinal: Expression;
}

export interface DisplayModeSettings extends DisplayOptions {
    mode: 'mathml' | 'html' | 'm';
    stretchyBrackets: boolean;
}

export type OptionListData =
    | {type: 'bool' | 'text'}
    | {type: 'number', min?: number, max?: number, step?: number}
    | {type: 'enum', candidates: [string, string][]}
;

export interface OptionItem {
    key: string;
    description: string;
    data: OptionListData;
}

export interface Applet {
    readonly root: HTMLElement;
    serialize(data: any): void;
    loadData(data: any): void;
}

export interface AppletEntry {
    readonly applet: Applet;
    title: string;
}