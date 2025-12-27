import type { GameState, BuildingKey, PlaceResult, Quest, Villager } from "../types";
import { BUILDINGS } from "./defs";
import { uid } from "@/shared/utils/uid";
import { recalcCap } from "./selectors";

const getIdleVillager = (s: GameState): Villager | null => {
    for (const v of s.villagers) {
        if (v.task.type === "idle") return v;
    }
    return null;
};

const setVillagerToBuilding = (v: Villager, x: number, y: number) => {
    v.task = { type: "toBuilding", target: { x, y } };
};

const setVillagerIdle = (v: Villager) => {
    v.task = { type: "idle" };
};

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
        started: s.tick,
        job: undefined
    };

    s.sel = null;
    recalcCap(s);

    return { ok: true, msg: `${d.name} wird gebaut` };
};

export const startProduction = (s: GameState, x: number, y: number): PlaceResult => {
    const c = s.grid[y]?.[x];
    if (!c) return { ok: false, msg: "Nichts da" };
    if (!c.done) return { ok: false, msg: "Wird gebaut" };

    if (c.job?.state === "working") return { ok: false, msg: "Läuft bereits" };
    if (c.job?.state === "ready") return { ok: false, msg: "Erst einsammeln" };

    const def = BUILDINGS[c.type];
    const prod = def.prod;
    if (!prod) return { ok: false, msg: "Keine Produktion" };

    const v = getIdleVillager(s);
    if (!v) return { ok: false, msg: "Keine Dorfbewohner frei" };

    const out: Partial<Record<"wood" | "food" | "gems" | "pop" | "cap", number>> = {};
    if (prod.wood) out.wood = prod.wood;
    if (prod.food) out.food = prod.food;

    c.job = {
        type: "produce",
        state: "working",
        total: 8,
        remain: 8,
        output: out,
        workerId: v.id
    };

    setVillagerToBuilding(v, x, y);

    return { ok: true, msg: `${v.name} arbeitet bei ${def.name}` };
};

export const collectOutput = (s: GameState, x: number, y: number): PlaceResult => {
    const c = s.grid[y]?.[x];
    if (!c || !c.done || !c.job) return { ok: false, msg: "Nichts da" };
    if (c.job.state !== "ready") return { ok: false, msg: "Noch nicht fertig" };

    const out = c.job.output || {};
    s.res.wood += out.wood || 0;
    s.res.food += out.food || 0;
    s.res.gems += out.gems || 0;
    s.res.pop += out.pop || 0;

    const wid = c.job.workerId;
    if (wid) {
        const v = s.villagers.find(x => x.id === wid);
        if (v) setVillagerIdle(v);
    }

    c.job = undefined;
    recalcCap(s);

    return { ok: true, msg: "Eingesammelt" };
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
