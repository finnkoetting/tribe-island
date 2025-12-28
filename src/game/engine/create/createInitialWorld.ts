import { World, WorldTile, WorldTileId } from "../../types/GameState";

const idx = (x: number, y: number, w: number) => y * w + x;

export function createInitialWorld(): World {
    const width = 64;
    const height = 64;

    const tiles: WorldTile[] = new Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const edge = x < 6 || y < 6 || x > width - 7 || y > height - 7;

            let id: WorldTileId = "grass";

            if (edge) id = "water";
            else {
                const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
                const r = n % 100;

                if (r < 6) id = "rock";
                else if (r < 16) id = "dirt";
                else if (r < 20) id = "sand";
                else id = "grass";
            }

            tiles[idx(x, y, width)] = { id };
        }
    }

    return {
        width,
        height,
        tiles,
        waterLevel: 0.25
    };
}
