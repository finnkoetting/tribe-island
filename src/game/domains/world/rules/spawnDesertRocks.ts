import { Building, GameState, Vec2 } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";
import { canPlaceAt } from "./canPlaceAt";
import { placeAt } from "./placeAt";

const rockId = (rng: () => number) => `rock_${Math.floor(rng() * 1e9).toString(16)}`;

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

const makeRock = (id: string, pos: Vec2): Building => ({
    id,
    type: "rock",
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
 * Spawn up to `count` rocks on free desert tiles. Uses canPlaceAt to avoid water/mountain
 * and respects existing building footprints.
 */
export function spawnDesertRocks(st: GameState, count: number, rng: () => number): GameState {
    if (count <= 0) return st;

    const desertIndices: number[] = [];
    for (let i = 0; i < st.world.tiles.length; i++) {
        if (st.world.tiles[i]?.id === "desert") desertIndices.push(i);
    }

    if (!desertIndices.length) return st;

    const shuffled = shuffle(desertIndices, rng);
    let next = st;
    let spawned = 0;

    for (const idx of shuffled) {
        if (spawned >= count) break;
        const pos = idxToPos(idx, st.world.width);
        if (isOccupied(pos, next)) continue;
        if (!canPlaceAt(next, pos, "rock")) continue;

        const rock = makeRock(rockId(rng), pos);
        next = placeAt(next, rock);
        spawned += 1;
    }

    return next;
}
