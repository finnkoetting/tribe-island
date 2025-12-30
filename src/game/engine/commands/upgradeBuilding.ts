import { GameState } from "../../types/GameState";
import { BUILDING_LEVELS, getLevelSpec } from "../../domains/buildings/model/buildingLevels";
import { canAffordCost, payCost } from "../../domains/buildings/model/buildingCosts";

export function upgradeBuilding(st: GameState, buildingId: string): GameState {
    const b = st.buildings[buildingId];
    if (!b) return st;

    const nextLevel = b.level + 1;
    const spec = getLevelSpec(b.type, nextLevel);
    if (!spec) return st; // no further upgrade

    const cost = spec.cost ?? {};
    if (!canAffordCost(st.inventory, cost)) return st; // cannot afford

    const nextInventory = payCost(st.inventory, cost);

    // Update building properties: level, adjust task duration/output if provided
    const nextBuilding = {
        ...b,
        level: nextLevel,
        task: {
            ...b.task,
            duration: spec.taskDurationMs ?? b.task.duration
        },
        output: b.output
            ? { ...b.output, amount: spec.outputAmount ?? b.output.amount }
            : b.output
    };

    return {
        ...st,
        inventory: nextInventory,
        buildings: {
            ...st.buildings,
            [buildingId]: nextBuilding
        },
        events: st.events.concat({ id: "resource_spent", atMs: st.nowMs, payload: { cost, reason: "upgrade", buildingId } })
    };
}
