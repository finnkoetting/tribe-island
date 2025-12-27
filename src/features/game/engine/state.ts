import type { GameState, Villager } from "../types";
import { BUILD_H, BUILD_W, BUILDINGS } from "./defs"
import { uid } from "@/shared/utils/uid";
import { clamp } from "@/shared/utils/clamp";
import { recalcCap } from "./selectors";

const names = ["Ava", "Noah", "Mila", "Leon", "Lia", "Ben", "Nina", "Finn"];

const mkVillager = (name: string, pos: { x: number; y: number }, i: number): Villager => ({
    id: uid(),
    name,
    pos,
    vel: { x: 0, y: 0 },
    speed: 0.055 + (i % 3) * 0.01,
    task: { type: "idle" }
});

const homeCells = (s: GameState) => {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;
        if (BUILDINGS[c.type].vibe === "home") cells.push({ x, y });
    }
    return cells;
};

const spawnSpot = (s: GameState, idx: number) => {
    const homes = homeCells(s);
    if (!homes.length) return { x: s.w / 2, y: s.h / 2 };
    const h = homes[idx % homes.length];
    const jitterX = (Math.random() - 0.5) * 0.18;
    const jitterY = (Math.random() - 0.5) * 0.18;
    return {
        x: clamp(h.x + 0.5 + jitterX, -0.2, s.w + 0.2),
        y: clamp(h.y + 0.5 + jitterY, -0.2, s.h + 0.2)
    };
};

export const syncVillagers = (s: GameState) => {
    const want = s.res.pop;
    const have = s.villagers.length;
    if (have >= want) return;

    for (let i = have; i < want; i++) {
        const name = i === 0 ? "Bürgermeister" : names[(i - 1) % names.length];
        const pos = spawnSpot(s, i);
        s.villagers.push(mkVillager(name, pos, i));
    }
};

export const createState = (): GameState => {
    const grid = Array.from({ length: BUILD_H }, () => Array.from({ length: BUILD_W }, () => null));
    const cx = Math.floor(BUILD_W / 2);
    const cy = Math.floor(BUILD_H / 2);

    grid[cy][cx] = {
        id: uid(),
        type: "townhall",
        done: true,
        remain: 0,
        started: 0,
        job: undefined
    };

    const state: GameState = {
        w: BUILD_W,
        h: BUILD_H,
        tick: 0,
        sel: null,
        res: { wood: 30, food: 10, gems: 0, pop: 1, cap: 0 },
        grid,
        claimed: {},
        villagers: []
    };

    recalcCap(state);
    syncVillagers(state);

    return state;
};