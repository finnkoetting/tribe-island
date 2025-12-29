import { GameState, GameSpeed } from "../../types/GameState";
import { createInitialWorld } from "./createInitialWorld";
import { createInitialVillagers } from "./createInitialVillagers";
import { spawnDesertRocks } from "../../domains/world/rules/spawnDesertRocks";
import { FOREST_TREE_FILL_RATIO, forestTreeShortage, spawnForestTrees } from "../../domains/world/rules/spawnForestTrees";
import { spawnBerryBushes } from "../../domains/world/rules/spawnBerryBushes";
import { spawnMushrooms } from "../../domains/world/rules/spawnMushrooms";

const MS_PER_DAY = 30 * 60 * 1000;

const mulberry32 = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let n = t;
        n = Math.imul(n ^ (n >>> 15), 1 | n);
        n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
        return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
};

const randInt = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export function createGame(seed = Date.now()): GameState {
    const world = createInitialWorld(seed);
    const villagers = createInitialVillagers();

    const rng = mulberry32(seed ^ 0x9e3779b9);
    const initialRockCount = 5 + randInt(rng, 0, 1);
    const initialBerryCount = 10 + randInt(rng, 0, 4);
    const initialMushroomCount = 6 + randInt(rng, 0, 3);

    const base: GameState = {
        version: 1,
        seed,
        nowMs: 0,
        speed: 1 as GameSpeed,

        time: {
            day: 1,
            phase: "morning",
            phaseIndex: 1,
            phaseElapsedMs: (2 / 6) * (MS_PER_DAY / 4), // 08:00 Uhr
            msPerDay: MS_PER_DAY
        },

        world,

        inventory: {
            wood: 20,
            berries: 15,
            stone: 0,
            fish: 0,
            fibers: 0,
            planks: 0,
            medicine: 0,
            knowledge: 0,
            gold: 0
        },

        buildings: {},

        villagers,

        quests: {
            tutorial_home: { id: "tutorial_home", title: "Baue das Rathaus", done: false, progress: 0, goal: 1, locked: false },
            tutorial_food: { id: "tutorial_food", title: "Entzuende ein Lagerfeuer", done: false, progress: 0, goal: 1, locked: true },
            tutorial_research: { id: "tutorial_research", title: "Errichte eine Sammlerhuette", done: false, progress: 0, goal: 1, locked: true },
            survive_first_crisis: { id: "survive_first_crisis", title: "Erste Krise ueberleben", done: false, progress: 0, goal: 1, locked: false }
        },

        alerts: {
            hunger: { id: "hunger", severity: 0 },
            illness: { id: "illness", severity: 0 },
            attack: { id: "attack", severity: 0 }
        },

        events: [],

        selection: { kind: "none" },

        placement: {
            active: false,
            buildingType: null,
            ghostPos: null
        },

        spawners: {
            rocksNextDay: 0,
            treesNextDay: 0,
            berriesNextDay: 0,
            mushroomsNextDay: 0
        },

        flags: {
            paused: false,
            working: true,
            sleeping: false
        }
    };

    let next = spawnDesertRocks(base, initialRockCount, rng);
    const forestTreeTarget = forestTreeShortage(next, FOREST_TREE_FILL_RATIO);
    next = spawnForestTrees(next, forestTreeTarget, rng, { targetFillRatio: FOREST_TREE_FILL_RATIO });
    next = spawnBerryBushes(next, initialBerryCount, rng);
    next = spawnMushrooms(next, initialMushroomCount, rng);

    const nextRockDay = base.time.day + randInt(rng, 1, 2);
    const nextTreeDay = base.time.day + randInt(rng, 1, 2);
    const nextBerryDay = base.time.day + randInt(rng, 1, 2);
    const nextMushroomDay = base.time.day + randInt(rng, 1, 2);

    return {
        ...next,
        spawners: {
            rocksNextDay: nextRockDay,
            treesNextDay: nextTreeDay,
            berriesNextDay: nextBerryDay,
            mushroomsNextDay: nextMushroomDay
        }
    };
}
