import { GameState, BuildingKey, Quest, PlaceResult } from "../types";
import { applyTick } from "./tick";
import {
    cancelSelection,
    claimQuest,
    collectOutput,
    placeBuilding,
    selectBuilding,
    startProduction
} from "./actions";
import { createInitialState } from "./reducersHelpers";

export type GameAction =
    | { type: "TICK" }
    | { type: "SELECT_BUILDING"; key: BuildingKey }
    | { type: "CANCEL_SELECTION" }
    | { type: "PLACE"; x: number; y: number }
    | { type: "START_JOB"; x: number; y: number }
    | { type: "COLLECT"; x: number; y: number }
    | { type: "CLAIM"; quest: Quest }
    | { type: "RESET" }
    | { type: "LOAD"; state: GameState };

export type ReduceResult = {
    state: GameState;
    result?: PlaceResult;
    claimed?: boolean;
};

export const gameReduce = (s: GameState, a: GameAction): ReduceResult => {
    const ns = structuredClone(s);

    if (a.type === "TICK") {
        applyTick(ns);
        return { state: ns };
    }

    if (a.type === "SELECT_BUILDING") {
        selectBuilding(ns, a.key);
        return { state: ns };
    }

    if (a.type === "CANCEL_SELECTION") {
        cancelSelection(ns);
        return { state: ns };
    }

    if (a.type === "PLACE") {
        const r = placeBuilding(ns, a.x, a.y);
        return { state: ns, result: r };
    }

    if (a.type === "START_JOB") {
        const r = startProduction(ns, a.x, a.y);
        return { state: ns, result: r };
    }

    if (a.type === "COLLECT") {
        const r = collectOutput(ns, a.x, a.y);
        return { state: ns, result: r };
    }

    if (a.type === "CLAIM") {
        const r = claimQuest(ns, a.quest);
        return { state: ns, claimed: !!r.ok };
    }

    if (a.type === "RESET") {
        return { state: createInitialState() };
    }

    if (a.type === "LOAD") {
        return { state: a.state };
    }

    return { state: ns };
};
