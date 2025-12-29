import { BuildingTypeId } from "../../../types/GameState";

export type Footprint = { w: number; h: number };

const SIZES: Record<BuildingTypeId, Footprint> = {
    townhall: { w: 3, h: 3 },
    campfire: { w: 2, h: 2 },
    gather_hut: { w: 2, h: 2 },
    storage: { w: 2, h: 2 },
    watchpost: { w: 2, h: 2 },
    road: { w: 1, h: 1 },
    rock: { w: 1, h: 1 },
    tree: { w: 1, h: 1 },
    berry_bush: { w: 1, h: 1 },
    mushroom: { w: 1, h: 1 }
};

export function getBuildingSize(type: BuildingTypeId): Footprint {
    return SIZES[type] ?? { w: 1, h: 1 };
}

export function getFootprintTopLeft(anchor: { x: number; y: number }, size: Footprint) {
    // Anchor is the tile the player clicked; center the footprint around it.
    const ox = anchor.x - Math.floor((size.w - 1) / 2);
    const oy = anchor.y - Math.floor((size.h - 1) / 2);
    return { x: ox, y: oy };
}
