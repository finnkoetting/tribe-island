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
