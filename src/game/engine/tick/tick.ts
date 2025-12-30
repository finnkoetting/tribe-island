import { GameState } from "../../types/GameState";
import { advanceTime } from "./advanceTime";
import { advancePhase } from "./advancePhase";
import { runPhaseSystems } from "./runPhaseSystems";
import { progressBuildingTasks } from "../../domains/buildings/rules/progressTask";
import { getClockMinutes, runClock } from "./runClock";
import { updateVillagerLocations } from "../../domains/villagers/rules/updateVillagerLocations";
import { updateAnimalLocations } from "../../domains/animals/rules/updateAnimalLocations";
import { evaluateTutorialQuests } from "../quests/evaluateTutorial";

export function tick(st: GameState, dtMs: number): GameState {
    const speedMul = st.flags.paused || st.speed === 0 ? 0 : st.speed === 1 ? 1 : 2;
    const effectiveDt = Math.max(0, dtMs) * speedMul;

    const prevClock = getClockMinutes(st);

    let next = advanceTime(st, dtMs);

    const nextClock = getClockMinutes(next);
    next = runClock(next, prevClock, nextClock);

    next = updateVillagerLocations(next, effectiveDt);
    next = updateAnimalLocations(next, effectiveDt);

    if (effectiveDt > 0) {
        next = applyNeedsDrift(next, effectiveDt);
    }

    if (effectiveDt > 0 && next.flags.working) {
        next = progressBuildingTasks(next, effectiveDt);
    }

    const beforePhase = next.time.phase;
    next = advancePhase(next);

    if (next.time.phase !== beforePhase) {
        next = runPhaseSystems(next);
    }

    next = evaluateTutorialQuests(next);

    return next;
}

function applyNeedsDrift(st: GameState, dtMs: number): GameState {
    const secs = dtMs / 1000;
    if (secs <= 0) return st;

    const sleeping = st.flags.sleeping;
    const workingPhase = st.flags.working;

    const nextVillagers: typeof st.villagers = {};

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }

        const working = workingPhase && Boolean(v.assignedBuildingId);

        const hungerRate = sleeping ? 0.0002 : working ? 0.00055 : 0.00035;
        const energyLoss = sleeping ? -0.0015 : working ? 0.0008 : 0.0005;

        const hunger = clamp01(v.needs.hunger + secs * hungerRate);
        const energy = clamp01(v.needs.energy - secs * energyLoss);

        nextVillagers[v.id] = {
            ...v,
            needs: { ...v.needs, hunger, energy }
        };
    }

    return { ...st, villagers: nextVillagers };
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}
