import { BuildingTypeId, GameState, QuestId } from "../../types/GameState";

const QUEST_TARGETS: Partial<Record<QuestId, BuildingTypeId>> = {
    tutorial_home: "townhall",
    tutorial_food: "campfire",
    tutorial_research: "gather_hut"
};

export function evaluateTutorialQuests(st: GameState): GameState {
    if (!st.quests) return st;

    const hasBuilding = (type: BuildingTypeId) => Object.values(st.buildings).some(b => b.type === type);

    let changed = false;
    const quests: GameState["quests"] = { ...st.quests };

    for (const [questId, type] of Object.entries(QUEST_TARGETS)) {
        if (!type) continue;
        const q = quests[questId as QuestId];
        if (!q) continue;

        const progress = hasBuilding(type) ? q.goal : 0;
        const done = progress >= q.goal;

        if (q.progress !== progress || q.done !== done) {
            quests[questId as QuestId] = { ...q, progress, done };
            changed = true;
        }
    }

    return changed ? { ...st, quests } : st;
}