import { GameState } from "../../types/GameState";
import { advanceTime } from "./advanceTime";
import { advancePhase } from "./advancePhase";
import { runPhaseSystems } from "./runPhaseSystems";
import { progressBuildingTasks } from "../../domains/buildings/rules/progressTask";
import { getClockMinutes, runClock } from "./runClock";

export function tick(st: GameState, dtMs: number): GameState {
    const speedMul = st.flags.paused || st.speed === 0 ? 0 : st.speed === 1 ? 1 : 2;
    const effectiveDt = Math.max(0, dtMs) * speedMul;

    const prevClock = getClockMinutes(st);

    let next = advanceTime(st, dtMs);

    const nextClock = getClockMinutes(next);
    next = runClock(next, prevClock, nextClock);

    if (effectiveDt > 0 && next.flags.working) {
        next = progressBuildingTasks(next, effectiveDt);
    }

    const beforePhase = next.time.phase;
    next = advancePhase(next);

    if (next.time.phase !== beforePhase) {
        next = runPhaseSystems(next);
    }

    return next;
}
