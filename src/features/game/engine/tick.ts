import type { GameState } from "../types";
import { POP_GROWTH_EVERY_TICKS, RES_MAX } from "./constants";
import { recalcCap } from "./selectors";
import { syncVillagers } from "./state";
import { clamp } from "@/shared/utils/clamp";

const stepToward = (px: number, py: number, tx: number, ty: number, spd: number) => {
    const dx = tx - px;
    const dy = ty - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.0001) return { x: tx, y: ty, vx: 0, vy: 0, arrived: true };
    const nx = dx / d;
    const ny = dy / d;

    const mv = Math.min(spd, d);
    const x = px + nx * mv;
    const y = py + ny * mv;

    return { x, y, vx: nx, vy: ny, arrived: d <= spd + 0.001 };
};

export const applyTick = (s: GameState) => {
    s.tick++;

    // 1) Build / Job timers
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c) continue;

        if (!c.done) {
            c.remain = Math.max(0, c.remain - 1);
            if (c.remain === 0) c.done = true;
            continue;
        }

        const j = c.job;
        if (!j || j.state !== "working") continue;

        j.remain = Math.max(0, j.remain - 1);
        if (j.remain === 0) j.state = "ready";
    }

    // 2) Recalc pop cap
    recalcCap(s);

    // 3) Pop growth (optional, later can be task-based)
    if (s.tick % POP_GROWTH_EVERY_TICKS === 0) {
        if (s.res.pop < s.res.cap) s.res.pop += 1;
    }

    // 4) Villager movement (world-space in grid units)
    for (const v of s.villagers) {
        if (v.task.type === "idle") {
            v.vel.x *= 0.6;
            v.vel.y *= 0.6;
            continue;
        }

        if (v.task.type === "toBuilding") {
            const tx = v.task.target.x + 0.5;
            const ty = v.task.target.y + 0.5;

            const r = stepToward(v.pos.x, v.pos.y, tx, ty, v.speed);
            v.pos.x = clamp(r.x, -0.5, s.w + 0.5);
            v.pos.y = clamp(r.y, -0.5, s.h + 0.5);
            v.vel.x = r.vx;
            v.vel.y = r.vy;

            if (r.arrived) {
                // Stay near target (idle-like), we keep task so the worker looks "assigned"
                // When player collects, the worker becomes idle again in actions.ts
                v.pos.x = tx;
                v.pos.y = ty;
            }
        }
    }

    syncVillagers(s);

    // 5) Clamp resources
    s.res.wood = clamp(s.res.wood, 0, RES_MAX);
    s.res.food = clamp(s.res.food, 0, RES_MAX);
    s.res.gems = clamp(s.res.gems, 0, RES_MAX);
    s.res.pop = clamp(s.res.pop, 0, s.res.cap);
};
