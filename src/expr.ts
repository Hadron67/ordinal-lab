export const enum ExpressionKind {
    SYMBOL,
}

export interface Symbol {
    readonly name: string;
}

export interface Pattern {
    readonly name?: string;
}
