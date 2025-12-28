import { GameState, Vec2 } from "../../../types/GameState";

export function canPlaceAt(st: GameState, pos: Vec2): boolean {
    if (pos.x < 0 || pos.y < 0) return false;
    if (pos.x >= st.world.width || pos.y >= st.world.height) return false;

    const i = pos.y * st.world.width + pos.x;
    const tile = st.world.tiles[i];
    if (!tile) return false;

    if (tile.id === "water") return false;

    for (const b of Object.values(st.buildings)) {
        if (b.pos.x === pos.x && b.pos.y === pos.y) return false;
    }

    return true;
}
