import { GameState, VillagerJobId } from "../../types/GameState";

export function assignVillagerJob(
    st: GameState,
    villagerId: string,
    job: VillagerJobId
): GameState {
    const v = st.villagers[villagerId];
    if (!v) return st;
    if (v.state !== "alive") return st;
    if (v.job === job) return st;

    const next = {
        ...st,
        villagers: {
            ...st.villagers,
            [villagerId]: {
                ...v,
                job,
                assignedBuildingId: null
            }
        },
        events: st.events.concat({
            id: "job_assigned",
            atMs: st.nowMs,
            payload: { villagerId, job }
        })
    };

    return next;
}
