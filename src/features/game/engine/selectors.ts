import { GameState, BuildingKey } from "../types";
import { BUILDINGS } from "./defs";
import { clamp } from "@/shared/utils/clamp";

export const countBuildings = (s: GameState, t: BuildingKey) => {
    let n = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (c && c.done && c.type === t) n++;
    }
    return n;
};

export const recalcCap = (s: GameState) => {
    let cap = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;
        cap += (BUILDINGS[c.type].cap || 0);
    }
    s.res.cap = cap;
    s.res.pop = clamp(s.res.pop, 0, cap);
};

export const neededPop = (s: GameState) => {
    let need = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;
        const p = BUILDINGS[c.type].prod;
        if (p?.needPop) need += p.needPop;
    }
    return need;
};

export const neededFood = (s: GameState) => {
    let need = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;
        const p = BUILDINGS[c.type].prod;
        if (p?.food && p.food < 0) need += (-p.food);
    }
    return need;
};

export const offlineCount = (s: GameState) => {
    let off = 0;
    let used = 0;
    const pop = s.res.pop;

    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (!c || !c.done) continue;
        const p = BUILDINGS[c.type].prod;
        if (!p?.needPop) continue;

        if (used + p.needPop <= pop) used += p.needPop;
        else off++;
    }

    return off;
};

export const pressure = (s: GameState) => {
    const off = offlineCount(s) * 10;
    const lack = s.res.pop < neededPop(s) ? 10 : 0;
    const over = neededFood(s) > s.res.food ? 12 : 0;
    return clamp(off + lack + over, 0, 100);
};

export const mood = (s: GameState) => {
    const bonus = countBuildings(s, "storage") * 6 + countBuildings(s, "totem") * 10;
    return clamp(100 - pressure(s) + bonus, 5, 100);
};

export const villageStatus = (s: GameState) => {
    const m = mood(s);
    const p = pressure(s);
    if (m >= 85 && p <= 20) return { t: "Stabil", dot: "" as const };
    if (m >= 65 && p <= 55) return { t: "Unruhig", dot: "warn" as const };
    return { t: "Kritisch", dot: "bad" as const };
};
