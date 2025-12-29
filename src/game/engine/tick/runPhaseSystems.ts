import { GameState, Alert, AlertId, Villager } from "../../types/GameState";
import { spawnDesertRocks } from "../../domains/world/rules/spawnDesertRocks";
import { FOREST_TREE_FILL_RATIO, forestTreeShortage, spawnForestTrees } from "../../domains/world/rules/spawnForestTrees";

export function runPhaseSystems(st: GameState): GameState {
    switch (st.time.phase) {
        case "morning":
            return runMorning(st);

        case "day":
            return runDay(st);

        case "evening":
            return runEvening(st);

        case "night":
            return runNight(st);

        default:
            return refreshAlerts(st);
    }
}

function runMorning(st: GameState): GameState {
    let next: GameState = {
        ...st,
        events: st.events.concat({
            id: "day_started",
            atMs: st.nowMs,
            payload: { day: st.time.day, reason: "morning_phase" }
        })
    };

    next = spawnRocksIfDue(next);
    next = spawnTreesIfDue(next);

    return refreshAlerts(next);
}

function runDay(st: GameState): GameState {
    const villagers = Object.values(st.villagers).filter(v => v.state === "alive");
    const gatherers = villagers.filter(v => v.job === "gatherer");

    let next: GameState = st;

    if (gatherers.length) {
        let berriesGain = 0;

        for (const v of gatherers) {
            const work = clamp01(v.stats.work);
            const morale = clamp01(v.stats.morale);
            const hungerPenalty = 1 - clamp01(v.needs.hunger) * 0.6;
            const energyPenalty = 0.5 + clamp01(v.needs.energy) * 0.5;

            const perPhase = 3;
            berriesGain += perPhase * work * morale * hungerPenalty * energyPenalty;
        }

        const add = Math.max(0, Math.floor(berriesGain));

        if (add) {
            next = {
                ...next,
                inventory: {
                    ...next.inventory,
                    berries: next.inventory.berries + add
                },
                events: next.events.concat({
                    id: "resource_added",
                    atMs: st.nowMs,
                    payload: { resource: "berries", amount: add, source: "gatherers" }
                })
            };
        }
    }

    return refreshAlerts(next);
}

function runEvening(st: GameState): GameState {
    // Essen läuft über runClock() (19:00). Hier erstmal keine Extra-Logik.
    return refreshAlerts(st);
}

function runNight(st: GameState): GameState {
    const nextVillagers: Record<string, Villager> = {};

    const sleeping = !!st.flags.sleeping;

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }

        const hungerUp = sleeping ? 0.05 : 0.08;
        const energyDown = sleeping ? -0.12 : -0.06; // sleeping regeneriert Energie

        const hunger = clamp01(v.needs.hunger + hungerUp);
        const energy = clamp01(v.needs.energy - energyDown);

        let morale = v.stats.morale;
        if (hunger > 0.75) morale -= 0.04;
        if (energy < 0.25) morale -= 0.03;
        if (sleeping && energy > v.needs.energy) morale += 0.02;
        morale = clamp01(morale);

        nextVillagers[v.id] = {
            ...v,
            needs: { ...v.needs, hunger, energy },
            stats: { ...v.stats, morale }
        };
    }

    return refreshAlerts({
        ...st,
        villagers: nextVillagers
    });
}

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

function spawnRocksIfDue(st: GameState): GameState {
    const nextDay = st.spawners.rocksNextDay;
    if (nextDay <= 0 || st.time.day < nextDay) return st;

    const rng = mulberry32(st.seed ^ (st.time.day * 2654435761));
    const after = spawnDesertRocks(st, 1, rng);
    const schedule = st.time.day + randInt(rng, 1, 2);

    return {
        ...after,
        spawners: { ...after.spawners, rocksNextDay: schedule }
    };
}

function spawnTreesIfDue(st: GameState): GameState {
    const nextDay = st.spawners.treesNextDay;
    if (nextDay <= 0 || st.time.day < nextDay) return st;

    const rng = mulberry32((st.seed ^ 0x85ebca6b) ^ (st.time.day * 2246822519));
    const shortage = forestTreeShortage(st, FOREST_TREE_FILL_RATIO);
    const spawnCount = shortage > 0 ? shortage : 0;
    const after = spawnCount ? spawnForestTrees(st, spawnCount, rng, { targetFillRatio: FOREST_TREE_FILL_RATIO }) : st;
    const schedule = st.time.day + randInt(rng, 1, 2);

    return {
        ...after,
        spawners: { ...after.spawners, treesNextDay: schedule }
    };
}

function refreshAlerts(st: GameState): GameState {
    const alive = Object.values(st.villagers).filter(v => v.state === "alive");
    const avgHunger = alive.length ? alive.reduce((a, v) => a + v.needs.hunger, 0) / alive.length : 0;

    const hungerSeverity: 0 | 1 | 2 = avgHunger > 0.85 ? 2 : avgHunger > 0.65 ? 1 : 0;

    const alerts: Record<AlertId, Alert> = {
        hunger: { id: "hunger", severity: hungerSeverity },
        illness: { id: "illness", severity: 0 },
        attack: { id: "attack", severity: 0 }
    };

    return { ...st, alerts };
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}
