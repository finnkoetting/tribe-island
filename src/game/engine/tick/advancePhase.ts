import { GamePhase, GameState } from "../../types/GameState";
import { getPhaseDurationMs } from "./advanceTime";

const ORDER: GamePhase[] = ["night", "morning", "day", "evening"];

export function advancePhase(st: GameState): GameState {
    const phaseMs = getPhaseDurationMs(st);
    if (st.time.phaseElapsedMs < phaseMs) return st;

    const carry = st.time.phaseElapsedMs - phaseMs;

    const nextIndex = ((st.time.phaseIndex + 1) % 4) as 0 | 1 | 2 | 3;
    const nextPhase = ORDER[nextIndex];

    const dayInc = nextIndex === 0 ? 1 : 0;

    return {
        ...st,
        time: {
            ...st.time,
            day: st.time.day + dayInc,
            phaseIndex: nextIndex,
            phase: nextPhase,
            phaseElapsedMs: carry
        },
        events: st.events.concat({
            id: "phase_changed",
            atMs: st.nowMs,
            payload: { phase: nextPhase, day: st.time.day + dayInc }
        })
    };
}
