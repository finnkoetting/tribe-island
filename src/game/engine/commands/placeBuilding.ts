import { GameState, BuildingTypeId, Vec2 } from "../../types/GameState";
import { canPlaceAt } from "../../domains/world/rules/canPlaceAt";
import { defaultBuilding, placeAt } from "../../domains/world/rules/placeAt";

const id = () => `b_${Math.random().toString(16).slice(2, 10)}`;

export function placeBuilding(st: GameState, type: BuildingTypeId, pos: Vec2): GameState {
    if (!canPlaceAt(st, pos)) return st;

    const building = defaultBuilding(type, id(), pos);
    return placeAt(st, building);
}
