import { GameState, BuildingTypeId, Vec2 } from "../../../types/GameState";
import { getBuildingSize, getFootprintTopLeft } from "../../buildings/model/buildingSizes";

export function canPlaceAt(st: GameState, pos: Vec2, type?: BuildingTypeId): boolean {
    const size = type ? getBuildingSize(type) : { w: 1, h: 1 };
    const topLeft = type ? getFootprintTopLeft(pos, size) : pos;

    // Bounds check for the full footprint.
    if (topLeft.x < 0 || topLeft.y < 0) return false;
    if (topLeft.x + size.w - 1 >= st.world.width) return false;
    if (topLeft.y + size.h - 1 >= st.world.height) return false;

    // Terrain and existing building collision check across the footprint.
    for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
            const x = topLeft.x + dx;
            const y = topLeft.y + dy;
            const i = y * st.world.width + x;
            const tile = st.world.tiles[i];
            if (!tile) return false;
            if (tile.id === "water") return false;

            // Check collision with existing building footprints.
            for (const b of Object.values(st.buildings)) {
                const s = getBuildingSize(b.type);
                const overlaps = x >= b.pos.x && x < b.pos.x + s.w && y >= b.pos.y && y < b.pos.y + s.h;
                if (overlaps) return false;
            }
        }
    }

    return true;
}
