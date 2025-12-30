import { GameState } from "../../types/GameState";
import { canAffordCost, payCost } from "../../domains/buildings/model/buildingCosts";

// Start a task on a building. taskId is a simple string identifying the selected task.
export function startBuildingTask(st: GameState, buildingId: string, taskId: string): GameState {
    const b = st.buildings[buildingId];
    if (!b) return st;

    // Define some simple task presets per building type / taskId
    let duration = b.task.duration || 60000;
    let setOutput = b.output ?? null;
    let nextInventory = st.inventory;

    if (b.type === "gather_hut") {
        if (taskId === "pick_mushrooms") {
            duration = 45000;
            setOutput = { resource: "mushrooms", amount: 1 };
        } else if (taskId === "pick_berries") {
            duration = 50000;
            setOutput = { resource: "berries", amount: 2 };
        } else if (taskId === "fruit_salad") {
            // Requires 2 berries and 1 mushroom
            const cost = { berries: 2, mushrooms: 1 };
            if (!canAffordCost(st.inventory, cost)) return st; // cannot start
            nextInventory = payCost(nextInventory, cost);
            duration = 60000;
            setOutput = null; // effect applied on collect
        } else if (taskId === "vorratskorb") {
            // Requires 3 berries and 2 mushrooms
            const cost = { berries: 3, mushrooms: 2 };
            if (!canAffordCost(st.inventory, cost)) return st;
            nextInventory = payCost(nextInventory, cost);
            duration = 75000;
            setOutput = null;
        }
    }

    if (b.type === "campfire") {
        if (taskId === "day_watch") {
            const cost = { berries: 2 };
            if (!canAffordCost(st.inventory, cost)) return st;
            nextInventory = payCost(nextInventory, cost);
            duration = 60000;
            setOutput = null;
        }
    }

    // Generic: set started, duration and taskId
    const next = {
        ...st,
        inventory: nextInventory,
        buildings: {
            ...st.buildings,
            [buildingId]: {
                ...b,
                task: {
                    ...b.task,
                    started: true,
                    progress: 0,
                    duration,
                    collectable: false,
                    blocked: false,
                    taskId
                },
                output: setOutput
            }
        }
    };

    return next;
}
