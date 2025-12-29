import { Building, BuildingTypeId, GameState, Vec2 } from "../../../types/GameState";

export function placeAt(st: GameState, building: Building): GameState {
    return {
        ...st,
        buildings: {
            ...st.buildings,
            [building.id]: building
        },
        events: st.events.concat({
            id: "building_placed",
            atMs: st.nowMs,
            payload: { buildingId: building.id, type: building.type, pos: building.pos }
        })
    };
}

export function defaultBuilding(type: BuildingTypeId, id: string, pos: Vec2): Building {
    const output =
        type === "gather_hut"
            ? ({ resource: "berries", amount: 6 } as const)
            : type === "sawmill"
            ? ({ resource: "planks", amount: 4 } as const)
            : null;

    const taskKind = type === "gather_hut" || type === "sawmill" ? "produce" : "none";
    const taskDuration = type === "gather_hut" ? 30000 : type === "sawmill" ? 45000 : 0;

    return {
        id,
        type,
        pos,
        level: 1,
        assignedVillagerIds: [],
        residentIds: [],
        task: {
            kind: taskKind,
            progress: 0,
            duration: taskDuration,
            blocked: false,
            collectable: false
        },
        output
    };
}
