import { GameState } from "../../types/GameState";

export function collectFromBuilding(st: GameState, buildingId: string): GameState {
    const b = st.buildings[buildingId];
    if (!b) return st;
    if (!b.task.collectable) return st;
    if (!b.output) return st;

    const next = {
        ...st,
        inventory: {
            ...st.inventory,
            [b.output.resource]: st.inventory[b.output.resource] + b.output.amount
        },
        buildings: {
            ...st.buildings,
            [buildingId]: {
                ...b,
                task: {
                    ...b.task,
                    progress: 0,
                    collectable: false
                }
            }
        },
        events: st.events.concat({
            id: "resource_added",
            atMs: st.nowMs,
            payload: { resource: b.output.resource, amount: b.output.amount, source: "building", buildingId }
        })
    };

    return next;
}
