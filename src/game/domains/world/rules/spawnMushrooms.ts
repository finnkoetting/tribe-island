import { Building, GameState, Vec2, WorldTileId } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";
import { canPlaceAt } from "./canPlaceAt";
import { placeAt } from "./placeAt";

const mushroomId = (rng: () => number) => `mush_${Math.floor(rng() * 1e9).toString(16)}`;

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

const makeMushroom = (id: string, pos: Vec2, variant: number, amount: number): Building => ({
    id,
    type: "mushroom",
    pos,
    level: 1,
    assignedVillagerIds: [],
    residentIds: [],
    task: {
        kind: "none",
        progress: 0,
        duration: 0,
        blocked: false,
        collectable: true
    },
    variant,
    output: {
        resource: "mushrooms",
        amount
    }
});

const ALLOWED_TILES = new Set<WorldTileId>(["forest", "meadow"]);

export function spawnMushrooms(st: GameState, count: number, rng: () => number): GameState {
    if (count <= 0) return st;

    const candidates: number[] = [];
    for (let i = 0; i < st.world.tiles.length; i++) {
        const id = st.world.tiles[i]?.id;
        if (id && ALLOWED_TILES.has(id)) candidates.push(i);
    }

    if (!candidates.length) return st;

    const shuffled = shuffle(candidates, rng);
    let next = st;
    let spawned = 0;

    for (const idx of shuffled) {
        if (spawned >= count) break;
        const pos = idxToPos(idx, st.world.width);
        if (isOccupied(pos, next)) continue;
        if (!canPlaceAt(next, pos, "mushroom")) continue;

        const variant = 1 + Math.floor(rng() * 3);
        const amount = variant; // mapping: variant 1 -> 1, 2 -> 2, 3 -> 3 mushrooms
        const mush = makeMushroom(mushroomId(rng), pos, variant, amount);
        next = placeAt(next, mush);
        spawned += 1;
    }

    return next;
}
