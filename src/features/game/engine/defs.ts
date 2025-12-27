import { BuildingDef, BuildingKey, Quest, GameState } from "../types";

export const BUILD_W = 12;
export const BUILD_H = 8;

export const BUILDINGS: Record<BuildingKey, BuildingDef> = {
    hut: {
        key: "hut",
        name: "Hütte",
        icon: "🏠",
        time: 8,
        cost: { wood: 10 },
        cap: 2,
        vibe: "home",
        desc: "+2 Pop-Cap"
    },
    farm: {
        key: "farm",
        name: "Farm",
        icon: "🌾",
        time: 10,
        cost: { wood: 12 },
        cap: 0,
        prod: { food: 3, needPop: 1 },
        vibe: "prod",
        desc: "+ Food / Tick (braucht 1 Pop)"
    },
    lumber: {
        key: "lumber",
        name: "Holzwerk",
        icon: "🪵",
        time: 12,
        cost: { wood: 18, food: 4 },
        cap: 0,
        prod: { wood: 3, food: -1, needPop: 1 },
        vibe: "prod",
        desc: "+ Holz / Tick (braucht 1 Pop, frisst Food)"
    },
    storage: {
        key: "storage",
        name: "Lager",
        icon: "📦",
        time: 14,
        cost: { wood: 22, food: 6 },
        cap: 0,
        vibe: "support",
        desc: "+ Stimmung (Druck −)"
    },
    totem: {
        key: "totem",
        name: "Totem",
        icon: "🗿",
        time: 18,
        cost: { wood: 28, food: 10 },
        cap: 0,
        vibe: "support",
        desc: "Stimmung ++ (Druck −)"
    }
};

export const BUILD_ORDER: BuildingKey[] = ["hut", "farm", "lumber", "storage", "totem"];

const pct = (a: number, b: number) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));

export const count = (s: GameState, t: BuildingKey) => {
    let n = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const c = s.grid[y][x];
        if (c && c.done && c.type === t) n++;
    }
    return n;
};

export const QUESTS: Quest[] = [
    {
        id: "q1",
        name: "Willkommen!",
        desc: "Baue 1 Hütte.",
        reward: { gems: 1, wood: 10 },
        done: (s) => count(s, "hut") >= 1,
        progress: (s) => pct(count(s, "hut"), 1)
    },
    {
        id: "q2",
        name: "Erste Ernte",
        desc: "Baue 1 Farm.",
        reward: { gems: 1, food: 12 },
        done: (s) => count(s, "farm") >= 1,
        progress: (s) => pct(count(s, "farm"), 1)
    },
    {
        id: "q3",
        name: "Werkzeuge!",
        desc: "Baue 1 Holzwerk.",
        reward: { gems: 2, wood: 16 },
        done: (s) => count(s, "lumber") >= 1,
        progress: (s) => pct(count(s, "lumber"), 1)
    },
    {
        id: "q4",
        name: "Wachstum",
        desc: "Erreiche Pop-Cap 6.",
        reward: { gems: 2, wood: 20, food: 10 },
        done: (s) => s.res.cap >= 6,
        progress: (s) => pct(s.res.cap, 6)
    },
    {
        id: "q5",
        name: "Stabile Insel",
        desc: "Baue Lager oder Totem.",
        reward: { gems: 3, wood: 25 },
        done: (s) => count(s, "storage") + count(s, "totem") >= 1,
        progress: (s) => pct(count(s, "storage") + count(s, "totem"), 1)
    }
];
