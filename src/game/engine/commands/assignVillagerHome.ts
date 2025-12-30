import { GameState } from "../../types/GameState";

export function assignVillagerHome(st: GameState, villagerId: string, buildingId: string | null): GameState {
    const v = st.villagers[villagerId];
    if (!v || v.state !== "alive") return st;

    const prevHomeId = v.homeBuildingId;
    let buildings = st.buildings;

    if (prevHomeId && buildings[prevHomeId]) {
        const prev = buildings[prevHomeId];
        buildings = {
            ...buildings,
            [prevHomeId]: {
                ...prev,
                residentIds: (prev.residentIds ?? []).filter(id => id !== villagerId)
            }
        };
    }

    if (buildingId && buildings[buildingId]) {
        const nextB = buildings[buildingId];
        const current = nextB.residentIds ?? [];
        const already = current.includes(villagerId);
        const capacity = getHomeCapacity(nextB.type, nextB.level);
        if (already || current.length < capacity) {
            buildings = {
                ...buildings,
                [buildingId]: {
                    ...nextB,
                    residentIds: already ? current : current.concat(villagerId)
                }
            };
        }
    }

    return {
        ...st,
        buildings,
        villagers: {
            ...st.villagers,
            [villagerId]: {
                ...v,
                homeBuildingId: buildingId
            }
        },
        events: st.events.concat({
            id: "home_assigned",
            atMs: st.nowMs,
            payload: { villagerId, buildingId }
        })
    };
}

function getHomeCapacity(type: GameState["buildings"][string]["type"], level = 1): number {
    if (type === "townhall") return 1; // Only one resident allowed in townhall
    if (type === "sleep_hut") {
        if (level >= 5) return 6;
        if (level === 4) return 5;
        if (level === 3) return 4;
        if (level === 2) return 3;
        return 2;
    }
    return Infinity;
}
