import { GameState, BuildingTypeId, ResourceId, Vec2 } from "../../types/GameState";
import { canPlaceAt } from "../../domains/world/rules/canPlaceAt";
import { defaultBuilding, placeAt } from "../../domains/world/rules/placeAt";
import { BUILDING_COSTS, type BuildingCost, canAffordCost, payCost } from "../../domains/buildings/model/buildingCosts";
import { getBuildingSize, getFootprintTopLeft } from "../../domains/buildings/model/buildingSizes";
import { evaluateTutorialQuests } from "../quests/evaluateTutorial";

const id = () => `b_${Math.random().toString(16).slice(2, 10)}`;

export function placeBuilding(st: GameState, type: BuildingTypeId, pos: Vec2): GameState {
    const size = getBuildingSize(type);
    const topLeft = getFootprintTopLeft(pos, size);

    if (!canPlaceAt(st, pos, type)) return st;

    const cost = BUILDING_COSTS[type] ?? {};
    if (!canAffordCost(st.inventory, cost)) return st;

    const building = defaultBuilding(type, id(), topLeft);
    let next = placeAt(st, building);

    const { inventory, events } = spendResources(next, cost, type);
    next = {
        ...next,
        inventory,
        events
    };

    next = evaluateTutorialQuests(next);

    return next;
}

function spendResources(st: GameState, cost: BuildingCost, type: BuildingTypeId) {
    const inventory = payCost(st.inventory, cost);

    const resourceEvents = Object.entries(cost)
        .filter(([, amount]) => amount && amount > 0)
        .map(([resource, amount]) => ({
            id: "resource_spent" as const,
            atMs: st.nowMs,
            payload: { resource: resource as ResourceId, amount, reason: `build_${type}` }
        }));

    return {
        inventory,
        events: st.events.concat(resourceEvents)
    };
}
