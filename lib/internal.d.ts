import { OrdinalExpression } from "./types";

interface ComparatorState {
    stack: ComparingFrame[];
    ret: 1 | -1 | 0;
}

interface ComparingFrame {
    doIt(state: ComparatorState): void;
}

interface MaximizerState {
    stack: MaximizerFrame[];
    ret: OrdinalExpression | null;
}

interface MaximizerFrame {
    doIt(state: MaximizerState, n: number): void;
}
