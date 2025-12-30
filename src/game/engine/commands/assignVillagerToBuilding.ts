import { GameState } from "../../types/GameState";

export function assignVillagerToBuilding(st: GameState, villagerId: string, buildingId: string | null): GameState {
    const v = st.villagers[villagerId];
    if (!v || v.state !== "alive") return st;

    const prevBuildingId = v.assignedBuildingId;

    let buildings = st.buildings;

    if (prevBuildingId && buildings[prevBuildingId]) {
        const pb = buildings[prevBuildingId];
        buildings = {
            ...buildings,
            [prevBuildingId]: {
                ...pb,
                assignedVillagerIds: pb.assignedVillagerIds.filter(id => id !== villagerId)
            }
        };
    }

    if (buildingId && buildings[buildingId]) {
        const nb = buildings[buildingId];
        const already = nb.assignedVillagerIds.includes(villagerId);
        const capacity = getWorkCapacity(nb.type, nb.level);
        if (!already && nb.assignedVillagerIds.length >= capacity) {
            return {
                ...st,
                buildings,
                villagers: {
                    ...st.villagers,
                    [villagerId]: {
                        ...v,
                        assignedBuildingId: null
                    }
                }
            };
        }

        buildings = {
            ...buildings,
            [buildingId]: {
                ...nb,
                assignedVillagerIds: already ? nb.assignedVillagerIds : nb.assignedVillagerIds.concat(villagerId)
            }
        };
    }

    return {
        ...st,
        buildings,
        villagers: {
            ...st.villagers,
            [villagerId]: {
                ...v,
                assignedBuildingId: buildingId
            }
        }
    };
}


function getWorkCapacity(type: GameState["buildings"][string]["type"], level: number): number {
    if (type === "gather_hut") {
        if (level >= 5) return 5;
        if (level === 4) return 4;
        if (level === 3) return 4;
        if (level === 2) return 2;
        return 1; // level 1 default
    }
    if (type === "sawmill") {
        if (level >= 3) return 3;
        if (level === 2) return 2;
        return 1;
    }
    if (type === "campfire") {
        if (level >= 2) return 2;
        return 1;
    }
    return Infinity;
}
