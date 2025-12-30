import { GameState } from "../../../types/GameState";

export function progressBuildingTasks(st: GameState, dtMs: number): GameState {
    if (!dtMs || dtMs <= 0) return st;

    const ids = Object.keys(st.buildings);
    if (!ids.length) return st;

    const next = { ...st.buildings };
    let changed = false;

    for (const id of ids) {
        const b = st.buildings[id];
        if (!b) continue;
        if (b.task.kind === "none") continue;
        if (b.task.blocked) continue;
        if (b.task.collectable) continue;
        if (!b.assignedVillagerIds.length) continue;
        if (!b.task.started) continue;

        const dur = Math.max(1, b.task.duration);
        const p = Math.min(dur, b.task.progress + dtMs);

        if (p !== b.task.progress) {
            next[id] = {
                ...b,
                task: {
                    ...b.task,
                    progress: p,
                    collectable: p >= dur
                }
            };
            changed = true;
        }
    }

    return changed ? { ...st, buildings: next } : st;
}
