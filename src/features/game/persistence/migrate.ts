import { GameState } from "../types";
import { createState } from "../engine";
import { recalcCap } from "../engine/selectors";
import { syncVillagers } from "../engine/state";

export const SAVE_VERSION = 1;

type SaveBlob = {
    v: number;
    state: GameState;
};

export const pack = (state: GameState): SaveBlob => ({
    v: SAVE_VERSION,
    state
});

export const unpack = (raw: string): GameState => {
    try {
        const d = JSON.parse(raw) as SaveBlob;

        if (!d || typeof d !== "object") return createState();
        if (!("state" in d)) return createState();

        if (d.v === 1) {
            const state = d.state;
            const hasTownhall = state.grid.some((row) => row.some((cell) => cell?.type === "townhall"));

            if (!hasTownhall) {
                const cx = Math.floor(state.w / 2);
                const cy = Math.floor(state.h / 2);
                let placed = false;
                if (!state.grid[cy]?.[cx]) {
                    state.grid[cy][cx] = {
                        id: `${Date.now()}-townhall`,
                        type: "townhall",
                        done: true,
                        remain: 0,
                        started: 0
                    };
                    placed = true;
                }

                if (!placed) {
                    for (let y = 0; y < state.h; y++) for (let x = 0; x < state.w; x++) {
                        if (!state.grid[y][x]) {
                            state.grid[y][x] = {
                                id: `${Date.now()}-townhall`,
                                type: "townhall",
                                done: true,
                                remain: 0,
                                started: 0
                            };
                            placed = true;
                            break;
                        }
                    }
                }
            }

            recalcCap(state);
            if (state.res.pop < 1) state.res.pop = Math.min(1, state.res.cap);
            syncVillagers(state);
            return state;
        }

        return createState();
    } catch {
        return createState();
    }
};
