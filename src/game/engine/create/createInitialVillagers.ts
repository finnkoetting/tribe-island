import { Villager } from "../../types/GameState";

export function createInitialVillagers(): Record<string, Villager> {
    const baseX = 32;
    const baseY = 32;

    const mk = (
        id: string,
        name: string,
        job: Villager["job"],
        x: number,
        y: number,
        stats: Villager["stats"]
    ): Villager => ({
        id,
        name,
        pos: { x, y },
        facing: "right",
        lastFacingMs: 0,
        job,
        assignedBuildingId: null,
        homeBuildingId: null,
        stats,
        needs: {
            hunger: 0.2,
            energy: 0.8,
            illness: 0
        },
        state: "alive"
    });

    const villagers: Villager[] = [
        mk("v1", "Mia", "idle", baseX - 1, baseY + 0, { work: 1.1, int: 0.9, str: 0.9, morale: 1.0 }),
        mk("v2", "Finn", "idle", baseX + 1, baseY + 0, { work: 1.0, int: 0.9, str: 1.1, morale: 1.0 }),
        mk("v3", "Piet", "idle", baseX + 0, baseY - 1, { work: 0.9, int: 1.2, str: 0.8, morale: 1.0 }),
        mk("v4", "Ben", "idle", baseX - 2, baseY + 1, { work: 1.0, int: 1.0, str: 1.0, morale: 1.0 }),
        mk("v5", "Kirsten", "idle", baseX + 2, baseY + 1, { work: 1.0, int: 1.0, str: 1.0, morale: 1.0 })
    ];

    return Object.fromEntries(villagers.map(v => [v.id, v]));
}
