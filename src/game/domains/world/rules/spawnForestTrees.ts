import { Building, GameState, Vec2 } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";
import { canPlaceAt } from "./canPlaceAt";
import { placeAt } from "./placeAt";

export const FOREST_TREE_FILL_RATIO = 0.4;

const treeId = (rng: () => number) => `tree_${Math.floor(rng() * 1e9).toString(16)}`;

const idxToPos = (i: number, width: number): Vec2 => ({ x: i % width, y: Math.floor(i / width) });
const posToIdx = (pos: Vec2, width: number) => pos.y * width + pos.x;

const isOccupied = (pos: Vec2, st: GameState): boolean => {
    for (const b of Object.values(st.buildings)) {
        const size = getBuildingSize(b.type);
        const overlaps = pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        if (overlaps) return true;
    }
    return false;
};

const tileAt = (st: GameState, pos: Vec2) => st.world.tiles[posToIdx(pos, st.world.width)];

export function countForestTiles(world: GameState["world"]): number {
    let count = 0;
    for (const tile of world.tiles) {
        if (tile?.id === "forest") count += 1;
    }
    return count;
}

export function countTreesOnForest(st: GameState): number {
    let count = 0;
    for (const b of Object.values(st.buildings)) {
        if (b.type !== "tree") continue;
        const tile = tileAt(st, b.pos);
        if (tile?.id === "forest") count += 1;
    }
    return count;
}

export function forestTreeShortage(st: GameState, targetFillRatio = FOREST_TREE_FILL_RATIO): number {
    if (targetFillRatio <= 0) return 0;
    const forestTiles = countForestTiles(st.world);
    if (!forestTiles) return 0;
    const target = Math.floor(forestTiles * targetFillRatio);
    const current = countTreesOnForest(st);
    return Math.max(0, target - current);
}

const shuffle = <T,>(arr: T[], rng: () => number): T[] => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const makeTree = (id: string, pos: Vec2): Building => ({
    id,
    type: "tree",
    pos,
    level: 1,
    assignedVillagerIds: [],
    residentIds: [],
    task: {
        kind: "none",
        progress: 0,
        duration: 0,
        blocked: false,
        collectable: false
    },
    output: null
});

/**
 * Spawn trees on free forest tiles, respecting an optional target fill ratio for the biome.
 */
type SpawnTreeOptions = {
    targetFillRatio?: number;
};

export function spawnForestTrees(st: GameState, count: number, rng: () => number, options?: SpawnTreeOptions): GameState {
    const targetFillRatio = options?.targetFillRatio;
    const shortage = targetFillRatio !== undefined ? forestTreeShortage(st, targetFillRatio) : 0;
    const targetCount = targetFillRatio !== undefined ? Math.max(count, shortage) : count;

    if (targetCount <= 0) return st;

    const forestIndices: number[] = [];
    for (let i = 0; i < st.world.tiles.length; i++) {
        if (st.world.tiles[i]?.id === "forest") forestIndices.push(i);
    }

    if (!forestIndices.length) return st;

    const shuffled = shuffle(forestIndices, rng);
    let next = st;
    let spawned = 0;

    for (const idx of shuffled) {
        if (spawned >= targetCount) break;
        const pos = idxToPos(idx, st.world.width);
        if (isOccupied(pos, next)) continue;
        if (!canPlaceAt(next, pos, "tree")) continue;

        const tree = makeTree(treeId(rng), pos);
        next = placeAt(next, tree);
        spawned += 1;
    }

    return next;
}
