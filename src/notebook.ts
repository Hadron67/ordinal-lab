export const enum NotebookCellKind {
    TEXT,
    ORDINAL,
}

export interface OrdinalType<T> {
    serialize(data: any, ordinal: T): void;
    expand(ordinal: T): (() => T) | null;
}

export class Notebook {

}

export class NotebookCell {
    
}
