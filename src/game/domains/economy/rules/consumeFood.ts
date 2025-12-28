import { GameState, Villager } from "../../../types/GameState";

export function consumeFood(st: GameState, reason: "breakfast" | "dinner"): GameState {
    const alive = Object.values(st.villagers).filter(v => v.state === "alive");
    if (!alive.length) return st;

    const foodPerVillager = 2;
    const needed = alive.length * foodPerVillager;

    const available = st.inventory.berries;
    const consumed = Math.min(available, needed);
    const shortage = Math.max(0, needed - consumed);

    const nextVillagers: Record<string, Villager> = {};

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }

        const share = consumed > 0 ? consumed / alive.length : 0;
        const satiety = clamp01(share / foodPerVillager);

        const hungerDown = (reason === "breakfast" ? 0.18 : 0.24) * satiety;
        const energyUp = (reason === "breakfast" ? 0.08 : 0.12) * satiety;

        let hunger = clamp01(v.needs.hunger - hungerDown);
        const energy = clamp01(v.needs.energy + energyUp);

        let morale = v.stats.morale + 0.03 * satiety;
        if (shortage > 0) {
            morale -= 0.06;
            hunger = clamp01(hunger + 0.06);
        }
        morale = clamp01(morale);

        nextVillagers[v.id] = {
            ...v,
            needs: { ...v.needs, hunger, energy },
            stats: { ...v.stats, morale }
        };
    }

    let next: GameState = {
        ...st,
        villagers: nextVillagers,
        inventory: {
            ...st.inventory,
            berries: st.inventory.berries - consumed
        }
    };

    if (consumed > 0) {
        next = {
            ...next,
            events: next.events.concat({
                id: "resource_spent",
                atMs: next.nowMs,
                payload: { resource: "berries", amount: consumed, reason }
            })
        };
    }

    if (shortage > 0) {
        next = {
            ...next,
            events: next.events.concat({
                id: "resource_spent",
                atMs: next.nowMs,
                payload: { resource: "berries", amount: 0, reason: `${reason}_shortage`, shortage }
            })
        };
    }

    return next;
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}
