import type { GameState, Villager } from "../types";
import { BUILD_H, BUILD_W } from "./defs";
import { uid } from "@/shared/utils/uid";

const names = ["Ava", "Noah", "Mila", "Leon", "Lia", "Ben", "Nina", "Finn"];

const mkVillager = (i: number): Villager => ({
    id: uid(),
    name: names[i % names.length],
    pos: { x: 0.5 + i * 0.35, y: 0.4 + (i % 2) * 0.25 },
    vel: { x: 0, y: 0 },
    speed: 0.055 + (i % 3) * 0.01,
    task: { type: "idle" }
});

export const createState = (): GameState => ({
    w: BUILD_W,
    h: BUILD_H,
    tick: 0,
    sel: null,
    res: { wood: 30, food: 10, gems: 0, pop: 0, cap: 0 },
    grid: Array.from({ length: BUILD_H }, () => Array.from({ length: BUILD_W }, () => null)),
    claimed: {},
    villagers: [mkVillager(0), mkVillager(1), mkVillager(2)]
});
