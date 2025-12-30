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
        { level: 1, workers: 1, outputAmount: 1, taskDurationMs: 45000, notes: "Pilze pflücken verfügbar" },
        { level: 2, cost: { wood: 8, planks: 2 }, workers: 2, outputAmount: 2, taskDurationMs: 50000, notes: "Beeren sammeln verfügbar" },
        { level: 3, cost: { planks: 6, wheat: 5, rope: 3 }, workers: 2, outputAmount: 4, taskDurationMs: 60000, notes: "Fruchtsalat: 2 Beeren +1 Pilz" },
        { level: 4, cost: { planks: 10, wheat: 8, rope: 5, stone: 2 }, workers: 3, outputAmount: 6, taskDurationMs: 75000, notes: "Vorratskorb: 3 Beeren +2 Pilze" }
    ],
    campfire: [
        { level: 1, workers: 1, taskDurationMs: 0, notes: "Grund: Wache + Nachtregeneration" },
        { level: 2, cost: { planks: 6, wheat: 5, rope: 3 }, workers: 2, taskDurationMs: 0, notes: "Tageswache-Auftrag freigeschaltet" }
    ],
    sawmill: [
        { level: 1, workers: 1, outputAmount: 1, taskDurationMs: 90000 },
        { level: 2, cost: { wood: 6, planks: 2 }, workers: 2, outputAmount: 2, taskDurationMs: 85000, notes: "Gezieltes Fällen (+2 Holz)" },
        { level: 3, cost: { planks: 6, rope: 3, wheat: 4 }, workers: 2, outputAmount: 2, taskDurationMs: 80000, notes: "Bretter zuschneiden (+2 Bretter)" }
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
