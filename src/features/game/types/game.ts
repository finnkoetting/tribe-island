export type ResKey = "wood" | "food" | "gems" | "pop" | "cap";

export type BuildingKey = "townhall" | "hut" | "farm" | "lumber" | "storage" | "totem";

export type BuildingVibe = "home" | "prod" | "support";

export type BuildingProd = {
    wood?: number;
    food?: number;
    needPop?: number;
};

export type BuildingCost = Partial<Record<ResKey, number>>;

export type BuildingDef = {
    key: BuildingKey;
    name: string;
    icon: string;
    time: number;
    cost: BuildingCost;
    cap: number;
    prod?: BuildingProd;
    vibe: BuildingVibe;
    desc: string;
};

export type JobType = "build" | "produce" | "harvest";
export type JobState = "idle" | "working" | "ready";

export type Job = {
    type: JobType;
    state: JobState;
    total: number;
    remain: number;
    output?: Partial<Record<ResKey, number>>;
    workerId?: string;
};

export type Cell = null | {
    id: string;
    type: BuildingKey;
    done: boolean;
    remain: number;
    started: number;
    job?: Job;
};

export type Resources = Record<ResKey, number>;

export type Vec2 = { x: number; y: number };

export type VillagerTask =
    | { type: "idle" }
    | { type: "toBuilding"; target: { x: number; y: number } };

export type Villager = {
    id: string;
    name: string;
    pos: Vec2;
    vel: Vec2;
    speed: number;
    task: VillagerTask;
};

export type GameState = {
    w: number;
    h: number;
    tick: number;
    sel: BuildingKey | null;
    res: Resources;
    grid: Cell[][];
    claimed: Record<string, boolean>;
    villagers: Villager[];
};

export type Reward = Partial<Record<ResKey, number>>;

export type Quest = {
    id: string;
    name: string;
    desc: string;
    reward: Reward;
    done: (s: GameState) => boolean;
    progress: (s: GameState) => number;
};

export type ToastPayload = {
    t: string;
    m: string;
};

export type PlaceResult = {
    ok: boolean;
    msg: string;
};
