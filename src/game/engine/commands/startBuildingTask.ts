import { GameState } from "../../types/GameState";

export function startBuildingTask(st: GameState, buildingId: string, durationMs: number): GameState {
    const b = st.buildings[buildingId];
    if (!b) return st;

    const next = {
        ...st,
        buildings: {
            ...st.buildings,
            [buildingId]: {
                ...b,
                task: {
                    ...b.task,
                    progress: 0,
                    duration: Math.max(1, Math.floor(durationMs)),
                    blocked: false,
                    collectable: false,
                    started: true
                }
            }
        }
    };

    return next;
}
