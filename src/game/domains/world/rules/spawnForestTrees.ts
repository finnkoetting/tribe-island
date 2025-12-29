import { Building, GameState, Vec2 } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";
import { canPlaceAt } from "./canPlaceAt";
import { placeAt } from "./placeAt";

const treeId = (rng: () => number) => `tree_${Math.floor(rng() * 1e9).toString(16)}`;

const idxToPos = (i: number, width: number): Vec2 => ({ x: i % width, y: Math.floor(i / width) });

const isOccupied = (pos: Vec2, st: GameState): boolean => {
    for (const b of Object.values(st.buildings)) {
        const size = getBuildingSize(b.type);
        const overlaps = pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        if (overlaps) return true;
    }
    return false;
};

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
 * Spawn up to `count` trees on free forest tiles.
 */
export function spawnForestTrees(st: GameState, count: number, rng: () => number): GameState {
    if (count <= 0) return st;

    const forestIndices: number[] = [];
    for (let i = 0; i < st.world.tiles.length; i++) {
        if (st.world.tiles[i]?.id === "forest") forestIndices.push(i);
    }

    if (!forestIndices.length) return st;

    const shuffled = shuffle(forestIndices, rng);
    let next = st;
    let spawned = 0;

    for (const idx of shuffled) {
        if (spawned >= count) break;
        const pos = idxToPos(idx, st.world.width);
        if (isOccupied(pos, next)) continue;
        if (!canPlaceAt(next, pos, "tree")) continue;

        const tree = makeTree(treeId(rng), pos);
        next = placeAt(next, tree);
        spawned += 1;
    }

    return next;
}
