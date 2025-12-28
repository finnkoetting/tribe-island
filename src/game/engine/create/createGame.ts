import { GameState, GameSpeed } from "../../types/GameState";
import { createInitialWorld } from "./createInitialWorld";
import { createInitialVillagers } from "./createInitialVillagers";

const MS_PER_DAY = 30 * 60 * 1000;

export function createGame(seed = Date.now()): GameState {
    const world = createInitialWorld();
    const villagers = createInitialVillagers();

    return {
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
            tutorial_home: { id: "tutorial_home", title: "Zuhause aufbauen", done: false, progress: 0, goal: 1 },
            tutorial_food: { id: "tutorial_food", title: "Essen sichern", done: false, progress: 0, goal: 1 },
            tutorial_research: { id: "tutorial_research", title: "Forschung starten", done: false, progress: 0, goal: 1 },
            survive_first_crisis: { id: "survive_first_crisis", title: "Erste Krise überleben", done: false, progress: 0, goal: 1 }
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

        flags: {
            paused: false,
            working: true,
            sleeping: false
        }
    };
}
