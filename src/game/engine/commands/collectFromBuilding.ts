import { GameState } from "../../types/GameState";

function applyPreparedMeal(st: GameState, foodUnits: number): GameState {
    const alive = Object.values(st.villagers).filter(v => v.state === "alive");
    if (!alive.length) return st;

    const foodPerVillager = 2; // unit scaling
    const consumed = foodUnits; // already accounted for when starting task

    let nextVillagers: Record<string, typeof alive[0]> = {} as any;

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }
        const share = consumed > 0 ? consumed / alive.length : 0;
        const satiety = Math.min(1, share / foodPerVillager);

        const hungerDown = 0.24 * satiety;
        const energyUp = 0.12 * satiety;

        let hunger = clamp01(v.needs.hunger - hungerDown);
        const energy = clamp01(v.needs.energy + energyUp);

        let morale = v.stats.morale + 0.03 * satiety;
        morale = clamp01(morale);

        nextVillagers[v.id] = {
            ...v,
            needs: { ...v.needs, hunger, energy },
            stats: { ...v.stats, morale }
        };
    }

    return {
        ...st,
        villagers: nextVillagers
    };
}

export function collectFromBuilding(st: GameState, buildingId: string): GameState {
    const b = st.buildings[buildingId];
    if (!b) return st;
    if (!b.task.collectable) return st;

    // If building has an explicit output resource, collect normally.
    if (b.output) {
        const newInventory = {
            ...st.inventory,
            [b.output.resource]: st.inventory[b.output.resource] + b.output.amount
        };

        // For discrete natural resources (mushrooms/rocks), remove the building after harvest.
        const removable = b.type === "mushroom" || b.type === "rock";

        const newBuildings = { ...st.buildings };
        if (removable) {
            delete newBuildings[buildingId];
        } else {
            newBuildings[buildingId] = {
                ...b,
                task: {
                    ...b.task,
                    progress: 0,
                    collectable: false,
                    taskId: undefined
                }
            };
        }

        const next = {
            ...st,
            inventory: newInventory,
            buildings: newBuildings,
            events: st.events.concat({
                id: "resource_added",
                atMs: st.nowMs,
                payload: { resource: b.output.resource, amount: b.output.amount, source: "building", buildingId }
            })
        };

        return next;
    }

    // Special-case: recipe/effect tasks identified by taskId
    const tid = b.task.taskId;
    if (tid === "fruit_salad") {
        // fruit_salad granted foodUnits = 4
        const afterMeal = applyPreparedMeal(st, 4);
        const next = {
            ...afterMeal,
            buildings: {
                ...st.buildings,
                [buildingId]: {
                    ...b,
                    task: { ...b.task, progress: 0, collectable: false, taskId: undefined }
                }
            }
        };
        return next;
    }

    if (tid === "vorratskorb") {
        const afterMeal = applyPreparedMeal(st, 6);
        const next = {
            ...afterMeal,
            buildings: {
                ...st.buildings,
                [buildingId]: {
                    ...b,
                    task: { ...b.task, progress: 0, collectable: false, taskId: undefined }
                }
            }
        };
        return next;
    }

    if (tid === "day_watch") {
        // Day watch: -2 food (berries) already deducted at start; grant +0.05 morale to all villagers
        const nextVillagers: typeof st.villagers = {} as any;
        for (const v of Object.values(st.villagers)) {
            if (v.state !== "alive") {
                nextVillagers[v.id] = v;
                continue;
            }
            nextVillagers[v.id] = { ...v, stats: { ...v.stats, morale: Math.min(1, v.stats.morale + 0.05) } };
        }
        const next = {
            ...st,
            villagers: nextVillagers,
            buildings: {
                ...st.buildings,
                [buildingId]: {
                    ...b,
                    task: { ...b.task, progress: 0, collectable: false, taskId: undefined }
                }
            }
        };
        return next;
    }

    // Unknown special task: reset task state
    return {
        ...st,
        buildings: {
            ...st.buildings,
            [buildingId]: {
                ...b,
                task: { ...b.task, progress: 0, collectable: false, taskId: undefined }
            }
        }
    };
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

