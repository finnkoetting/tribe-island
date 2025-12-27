import { GameState, BuildingKey, PlaceResult, Quest } from "../types";
import { BUILDINGS } from "./defs";
import { uid } from "@/shared/utils/uid";
import { recalcCap } from "./selectors";

export const selectBuilding = (s: GameState, k: BuildingKey) => {
    s.sel = (s.sel === k) ? null : k;
};

export const cancelSelection = (s: GameState) => {
    s.sel = null;
};

export const canPay = (s: GameState, k: BuildingKey) => {
    const c = BUILDINGS[k].cost;
    return (s.res.wood >= (c.wood || 0)) && (s.res.food >= (c.food || 0)) && (s.res.gems >= (c.gems || 0));
};

export const pay = (s: GameState, k: BuildingKey) => {
    const c = BUILDINGS[k].cost;
    s.res.wood -= (c.wood || 0);
    s.res.food -= (c.food || 0);
    s.res.gems -= (c.gems || 0);
};

export const placeBuilding = (s: GameState, x: number, y: number): PlaceResult => {
    if (!s.sel) return { ok: false, msg: "Kein Bau gewählt" };
    if (x < 0 || y < 0 || x >= s.w || y >= s.h) return { ok: false, msg: "Außerhalb" };
    if (s.grid[y][x]) return { ok: false, msg: "Belegt" };

    const k = s.sel;
    if (!canPay(s, k)) return { ok: false, msg: "Zu teuer" };

    pay(s, k);
    const d = BUILDINGS[k];

    s.grid[y][x] = {
        id: uid(),
        type: k,
        done: false,
        remain: d.time,
        started: s.tick
    };

    s.sel = null;
    recalcCap(s);

    return { ok: true, msg: `${d.name} wird gebaut` };
};

export const claimQuest = (s: GameState, q: Quest) => {
    if (s.claimed[q.id]) return { ok: false };
    if (!q.done(s)) return { ok: false };

    s.claimed[q.id] = true;

    const r = q.reward;
    s.res.wood += (r.wood || 0);
    s.res.food += (r.food || 0);
    s.res.gems += (r.gems || 0);
    s.res.pop += (r.pop || 0);

    recalcCap(s);

    return { ok: true };
};
