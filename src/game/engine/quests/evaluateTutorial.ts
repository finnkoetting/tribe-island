import { BuildingTypeId, GameState, QuestId } from "../../types/GameState";

const QUEST_TARGETS: Partial<Record<QuestId, BuildingTypeId>> = {
    tutorial_home: "townhall",
    tutorial_food: "campfire",
    tutorial_research: "gather_hut"
};

const TUTORIAL_ORDER: QuestId[] = ["tutorial_home", "tutorial_food", "tutorial_research"];

export function evaluateTutorialQuests(st: GameState): GameState {
    if (!st.quests) return st;

    const hasBuilding = (type: BuildingTypeId) => Object.values(st.buildings).some(b => b.type === type);

    let changed = false;
    const quests: GameState["quests"] = { ...st.quests };

    let previousDone = true;
    for (const questId of TUTORIAL_ORDER) {
        const target = QUEST_TARGETS[questId];
        const q = quests[questId];
        if (!q) {
            previousDone = false;
            continue;
        }

        const locked: boolean = !previousDone;
        const progress: number = locked || !target ? 0 : hasBuilding(target) ? q.goal : 0;
        const done: boolean = locked ? false : progress >= q.goal;

        if (q.progress !== progress || q.done !== done || q.locked !== locked) {
            quests[questId] = { ...q, progress, done, locked };
            changed = true;
        }

        previousDone = done;
    }

    // Ensure non-tutorial quests stay unlocked by default
    for (const [questId, quest] of Object.entries(quests)) {
        const isTutorialQuest = TUTORIAL_ORDER.includes(questId as QuestId);
        if (!isTutorialQuest && quest.locked !== false) {
            quests[questId as QuestId] = { ...quest, locked: false };
            changed = true;
        }
    }

    return changed ? { ...st, quests } : st;
}