import { GameState, Vec2, Animal } from "../../../types/GameState";

const dogId = (rng: () => number) => `dog_${Math.floor(rng() * 1e9).toString(16)}`;
const idxToPos = (i: number, width: number): Vec2 => ({ x: i % width, y: Math.floor(i / width) });
const posToIdx = (pos: Vec2, width: number) => pos.y * width + pos.x;

const isOccupied = (pos: Vec2, st: GameState): boolean => {
    for (const b of Object.values(st.buildings)) {
        const size = { w: 1, h: 1 };
        const overlaps = pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        if (overlaps) return true;
    }
    return false;
};

const tileAt = (st: GameState, pos: Vec2) => st.world.tiles[posToIdx(pos, st.world.width)];

/** Spawn dogs on free forest tiles */
export function spawnForestDogs(st: GameState, count: number, rng: () => number): GameState {
    if (count <= 0) return st;

    const forestIndices: number[] = [];
    for (let i = 0; i < st.world.tiles.length; i++) {
        if (st.world.tiles[i]?.id === "forest") forestIndices.push(i);
    }

    if (!forestIndices.length) return st;

    // shuffle
    const shuffled = forestIndices.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let next = st;
    let spawned = 0;

    for (const idx of shuffled) {
        if (spawned >= count) break;
        const pos = idxToPos(idx, st.world.width);
        if (isOccupied(pos, next)) continue;

        const id = dogId(rng);
        const dog: Animal = { id, type: "dog", pos, state: "idle" };
        next = { ...next, animals: { ...(next.animals || {}), [id]: dog } };
        spawned += 1;
    }

    return next;
}
