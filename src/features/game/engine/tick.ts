import { GameState } from "../types";
import { BUILDINGS } from "./defs";
import { POP_GROWTH_EVERY_TICKS, RES_MAX } from "./constants";
import { recalcCap } from "./selectors";
import { clamp } from "@/shared/utils/clamp";

export const applyTick = (s: GameState) => {
    s.tick++;

    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || c.done) continue;

        c.remain = Math.max(0, c.remain - 1);
        if (c.remain === 0) c.done = true;
    }

    recalcCap(s);

    let usedPop = 0;
    const pop = s.res.pop;

    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;

        const prod = BUILDINGS[c.type].prod;
        if (!prod) continue;

        if (prod.needPop) {
            if (usedPop + prod.needPop <= pop) {
                usedPop += prod.needPop;
                s.res.wood += (prod.wood || 0);
                s.res.food += (prod.food || 0);
            }
        } else {
            s.res.wood += (prod.wood || 0);
            s.res.food += (prod.food || 0);
        }
    }

    if (s.tick % POP_GROWTH_EVERY_TICKS === 0) {
        if (s.res.pop < s.res.cap) s.res.pop += 1;
    }

    s.res.wood = clamp(s.res.wood, 0, RES_MAX);
    s.res.food = clamp(s.res.food, 0, RES_MAX);
    s.res.gems = clamp(s.res.gems, 0, RES_MAX);
    s.res.pop = clamp(s.res.pop, 0, s.res.cap);
};
