import { GameState } from "../../types/GameState";

export function advanceTime(st: GameState, dtMs: number): GameState {
    if (st.flags.paused || st.speed === 0) return st;

    const speedMul = st.speed === 1 ? 1 : 2;
    const delta = Math.max(0, dtMs) * speedMul;

    return {
        ...st,
        nowMs: st.nowMs + delta,
        time: {
            ...st.time,
            phaseElapsedMs: st.time.phaseElapsedMs + delta
        }
    };
}

export function getPhaseDurationMs(st: GameState): number {
    return st.time.msPerDay / 4;
}
