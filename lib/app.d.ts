import type { Expression } from "./types";

export interface OrdinalMarkupConfig {
    ordinal: string;
    clickRepeats: number;
    base: number;
    autoClicker: boolean;
    autoMaximize: boolean;
}

export interface ExpandedOrdinalRow {
    readonly id: number;
    readonly container: HTMLDivElement;
    readonly ordinal: Expression;
    readonly parent?: ExpandedOrdinalRow;
    readonly children: ExpandedOrdinalRow[];
    previous?: ExpandedOrdinalRow;
}
