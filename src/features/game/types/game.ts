export type ResKey = "wood" | "food" | "gems" | "pop" | "cap";

export type BuildingKey = "hut" | "farm" | "lumber" | "storage" | "totem";

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

export type Cell = null | {
  id: string;
  type: BuildingKey;
  done: boolean;
  remain: number;
  started: number;
};

export type Resources = Record<ResKey, number>;

export type GameState = {
  w: number;
  h: number;
  tick: number;
  sel: BuildingKey | null;
  res: Resources;
  grid: Cell[][];
  claimed: Record<string, boolean>;
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
