import { BuildingTypeId } from "../../../types/GameState";
import { BuildingCost } from "./buildingCosts";

export type BuildingLevelSpec = {
    level: number;
    cost?: BuildingCost; // cost to upgrade to this level
    workers?: number; // suggested assigned worker capacity
    residents?: number; // home capacity (for sleep_hut)
    outputAmount?: number; // for produce-type buildings
    taskDurationMs?: number;
    notes?: string;
};

export const BUILDING_LEVELS: Partial<Record<BuildingTypeId, BuildingLevelSpec[]>> = {
    gather_hut: [
        { level: 1, workers: 1, outputAmount: 1, taskDurationMs: 60000, notes: "mushrooms" },
        { level: 2, cost: { wood: 8, planks: 2 }, workers: 2, outputAmount: 2, taskDurationMs: 55000, notes: "berries" },
        { level: 3, cost: { planks: 6, fibers: 8 }, workers: 2, outputAmount: 4, taskDurationMs: 50000, notes: "fruit salad recipe unlocked" },
        { level: 4, cost: { planks: 10, fibers: 8, stone: 2 }, workers: 3, outputAmount: 6, taskDurationMs: 45000, notes: "vorratskorb recipe unlocked" }
    ],
    campfire: [
        { level: 1, workers: 1, taskDurationMs: 0, notes: "basic campfire: watch & night regen" },
        { level: 2, cost: { planks: 6, fibers: 8 }, workers: 2, taskDurationMs: 0, notes: "daily watch task unlocked" }
    ],
    sawmill: [
        { level: 1, workers: 1, outputAmount: 1, taskDurationMs: 90000 },
        { level: 2, cost: { wood: 6, planks: 2 }, workers: 2, outputAmount: 2, taskDurationMs: 85000, notes: "debark -> planks" },
        { level: 3, cost: { planks: 6, fibers: 3 }, workers: 2, outputAmount: 2, taskDurationMs: 80000, notes: "cut planks from wood" }
    ],
    townhall: [
        { level: 1, workers: 1, taskDurationMs: 120000, notes: "unlock job assignment & village quests" }
    ],
    sleep_hut: [
        { level: 1, residents: 2 },
        { level: 2, cost: { wood: 8, planks: 2 }, residents: 3 },
        { level: 3, cost: { planks: 6, fibers: 5 }, residents: 4 },
        { level: 4, cost: { planks: 10, fibers: 8, stone: 2 }, residents: 5 },
        { level: 5, cost: { planks: 14, fibers: 10, stone: 4 }, residents: 6, notes: "breeding/unlock population growth" }
    ]
};

export function getLevelSpec(type: BuildingTypeId, level: number): BuildingLevelSpec | null {
    const list = BUILDING_LEVELS[type];
    if (!list) return null;
    return list.find(l => l.level === level) ?? null;
}
