import { GameState } from "../../types/GameState";
import { consumeFood } from "../../domains/economy/rules/consumeFood";

const MINS = {
    BREAKFAST: 7 * 60,
    WORK_START: 8 * 60,
    DINNER: 19 * 60,
    SLEEP_START: 20 * 60
};

export function getClockMinutes(st: GameState): number {
    const phaseMs = st.time.msPerDay / 4;
    const dayMs = st.time.phaseIndex * phaseMs + st.time.phaseElapsedMs;
    const t = Math.max(0, Math.min(st.time.msPerDay, dayMs));
    return Math.floor((t / st.time.msPerDay) * 24 * 60);
}

export function runClock(st: GameState, prevMin: number, nextMin: number): GameState {
    if (prevMin === nextMin) return st;

    const crossed = (mark: number) => {
        if (nextMin > prevMin) return prevMin < mark && nextMin >= mark;
        return prevMin < mark || nextMin >= mark;
    };

    let next = st;

    if (crossed(MINS.BREAKFAST)) {
        next = consumeFood(next, "breakfast");
    }

    if (crossed(MINS.WORK_START)) {
        next = {
            ...next,
            flags: { ...next.flags, working: true, sleeping: false },
            events: next.events.concat({
                id: "day_started",
                atMs: next.nowMs,
                payload: { reason: "work_start", at: "08:00" }
            })
        };
    }

    if (crossed(MINS.DINNER)) {
        next = consumeFood(next, "dinner");
    }

    if (crossed(MINS.SLEEP_START)) {
        next = {
            ...next,
            flags: { ...next.flags, working: false, sleeping: true },
            events: next.events.concat({
                id: "phase_changed",
                atMs: next.nowMs,
                payload: { reason: "sleep_start", at: "20:00" }
            })
        };
    }

    return next;
}
