import { World, WorldTile, WorldTileId } from "../../types/GameState";

type CoastSide = "north" | "east" | "south" | "west";

const idx = (x: number, y: number, w: number) => y * w + x;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const mulberry32 = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let n = t;
        n = Math.imul(n ^ (n >>> 15), 1 | n);
        n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
        return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
};

const hash2D = (seed: number, x: number, y: number) => {
    let h = x * 374761393 + y * 668265263 + seed * 1446647;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h >>> 0) / 4294967295;
};

const valueNoise = (seed: number, x: number, y: number, freq: number) => {
    const xf = x * freq;
    const yf = y * freq;

    const x0 = Math.floor(xf);
    const y0 = Math.floor(yf);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = xf - x0;
    const sy = yf - y0;

    const n00 = hash2D(seed, x0, y0);
    const n10 = hash2D(seed, x1, y0);
    const n01 = hash2D(seed, x0, y1);
    const n11 = hash2D(seed, x1, y1);

    const ix0 = lerp(n00, n10, sx);
    const ix1 = lerp(n01, n11, sx);
    return lerp(ix0, ix1, sy);
};

const domainWarp = (seed: number, x: number, y: number, strength: number) => {
    const wx = valueNoise(seed + 301, x, y, 0.08) - 0.5;
    const wy = valueNoise(seed + 733, x, y, 0.08) - 0.5;
    return { x: x + wx * strength, y: y + wy * strength };
};

const fbm = (seed: number, x: number, y: number, octaves: number, lacunarity: number, gain: number) => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;

    for (let i = 0; i < octaves; i++) {
        sum += amp * valueNoise(seed + i * 97, x, y, freq);
        norm += amp;
        amp *= gain;
        freq *= lacunarity;
    }

    return sum / norm;
};

const pickCoastSide = (seed: number): CoastSide => {
    const rng = mulberry32(seed ^ 0x9e3779b9);
    const sides: CoastSide[] = ["north", "east", "south", "west"];
    return sides[Math.floor(rng() * sides.length)];
};

const distToCoast = (side: CoastSide, x: number, y: number, w: number, h: number) => {
    switch (side) {
        case "north":
            return y;
        case "south":
            return h - 1 - y;
        case "west":
            return x;
        case "east":
        default:
            return w - 1 - x;
    }
};

type LandScores = {
    desert: number;
    swamp: number;
    forest: number;
};

const idxToXY = (i: number, w: number) => ({ x: i % w, y: Math.floor(i / w) });

const limitBiomeRegions = (tiles: WorldTile[], width: number, height: number, biome: WorldTileId, maxRegions: number) => {
    const visited = new Uint8Array(tiles.length);
    const dirs = [1, -1, width, -width];
    const regions: number[][] = [];

    for (let i = 0; i < tiles.length; i++) {
        if (visited[i] || tiles[i]?.id !== biome) continue;
        const stack = [i];
        visited[i] = 1;
        const region: number[] = [];

        while (stack.length) {
            const cur = stack.pop()!;
            region.push(cur);
            const x = cur % width;
            for (const d of dirs) {
                const nxt = cur + d;
                const nx = nxt % width;
                if (nxt < 0 || nxt >= tiles.length) continue;
                if ((d === 1 && nx === 0) || (d === -1 && x === 0)) continue;
                if (visited[nxt] || tiles[nxt]?.id !== biome) continue;
                visited[nxt] = 1;
                stack.push(nxt);
            }
        }

        regions.push(region);
    }

    if (regions.length <= maxRegions) return;

    regions.sort((a, b) => b.length - a.length);
    for (let r = maxRegions; r < regions.length; r++) {
        for (const idx of regions[r]) tiles[idx] = { id: "meadow" };
    }
};

const carveRiver = (
    tiles: WorldTile[],
    width: number,
    height: number,
    coastSide: CoastSide,
    coastBandMap: number[],
    landScores: { i: number; moisture: number }[],
    rng: () => number
) => {
    const deepInland = landScores.filter(({ i }) => coastBandMap[i] > 14);
    const source = (deepInland.length ? deepInland : landScores).reduce((best, cur) =>
        cur.moisture > best.moisture ? cur : best
    );

    let { x, y } = idxToXY(source.i, width);

    const dir = (() => {
        switch (coastSide) {
            case "north":
                return { dx: 0, dy: -1 };
            case "south":
                return { dx: 0, dy: 1 };
            case "west":
                return { dx: -1, dy: 0 };
            case "east":
            default:
                return { dx: 1, dy: 0 };
        }
    })();

    const maxSteps = Math.floor(width + height); // kürzerer Fluss

    for (let step = 0; step < maxSteps; step++) {
        if (x < 0 || y < 0 || x >= width || y >= height) break;
        const i = idx(x, y, width);

        if (coastBandMap[i] <= 4 || tiles[i]?.id === "water") break; // nicht mit Meer verbinden

        const setWater = (nx: number, ny: number) => {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
            const ni = idx(nx, ny, width);
            if (coastBandMap[ni] <= 3) return; // Abstand zur Küste halten
            tiles[ni] = { id: "water" };
        };

        setWater(x, y); // Kernlinie

        // Seltene Ausbuchtungen für organisch, aber schmal bleiben
        if (rng() > 0.8) setWater(x + 1, y);
        if (rng() > 0.8) setWater(x - 1, y);
        if (rng() > 0.85) setWater(x, y + 1);
        if (rng() > 0.85) setWater(x, y - 1);

        const jitterX = Math.round((rng() - 0.5) * 1.6);
        const jitterY = Math.round((rng() - 0.5) * 1.6);

        x += dir.dx + jitterX;
        y += dir.dy + jitterY;
    }
};

const ensureLake = (
    tiles: WorldTile[],
    width: number,
    height: number,
    coastBandMap: number[],
    landScores: { i: number; moisture: number }[]
) => {
    const inland = landScores.filter(({ i }) => coastBandMap[i] > 10);
    if (!inland.length) return;
    const center = inland.reduce((best, cur) => (cur.moisture > best.moisture ? cur : best));
    const { x, y } = idxToXY(center.i, width);

    const lakeRadius = 3; // größerer See-Körper
    for (let dy = -lakeRadius; dy <= lakeRadius; dy++) {
        for (let dx = -lakeRadius; dx <= lakeRadius; dx++) {
            const manhattan = Math.abs(dx) + Math.abs(dy);
            if (manhattan > lakeRadius + 1) continue;
            // Kleine Unregelmäßigkeit
            if (manhattan === lakeRadius + 1 && hash2D(777, dx, dy) < 0.35) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = idx(nx, ny, width);
            tiles[ni] = { id: "water" };
        }
    }
};

export function createInitialWorld(seed = Date.now()): World {
    const width = 128;
    const height = 64;

    const totalTiles = width * height;
    const targetWater = Math.max(Math.round(totalTiles * 0.12), Math.ceil(totalTiles * 0.05)); // tiefer Ozean, >=5%
    const targetSand = Math.round(totalTiles * 0.06); // bebaubarer Küstensaum
    const targetOceanTotal = targetWater + targetSand;

    const targetDesert = Math.round(totalTiles * 0.08); // weniger Wüste
    const targetSwamp = Math.round(totalTiles * 0.13);
    const targetForest = Math.round(totalTiles * 0.33);
    const targetMeadow = Math.round(totalTiles * 0.23);

    const coastSide: CoastSide = "north";
    const rng = mulberry32(seed + 1337);

    const coastDepthBase = coastSide === "east" || coastSide === "west" ? targetOceanTotal / height : targetOceanTotal / width;
    const coastDepth = Math.max(6, Math.min(40, Math.round(coastDepthBase * lerp(0.9, 1.1, rng()))));
    const coastWobble = 4 + Math.floor(rng() * 5);
    const coastWarpStrength = 9;

    const tiles: WorldTile[] = new Array(totalTiles);

    const coastScores: { i: number; score: number }[] = [];
    const coastBandMap: number[] = new Array(totalTiles).fill(0);
    const landScores: { i: number; scores: LandScores; moisture: number; biomeNoise: number }[] = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const warped = domainWarp(seed + 17, x, y, coastWarpStrength);
            const distance = distToCoast(coastSide, warped.x, warped.y, width, height);
            const wobble = Math.floor(valueNoise(seed + 5, x / 5.5, y / 5.5, 1) * coastWobble);
            const coastBand = distance - wobble;
            const i = idx(x, y, width);
            coastScores.push({ i, score: coastBand });
            coastBandMap[i] = coastBand;

            const landWarp = domainWarp(seed + 41, x, y, 7);

            const moistureBase = fbm(seed + 11, landWarp.x / 62, landWarp.y / 62, 4, 2, 0.55);
            const moistureDetail = valueNoise(seed + 211, x / 12, y / 12, 1);
            const moisture = lerp(moistureBase, moistureDetail, 0.25);

            const biomeBase = fbm(seed + 23, landWarp.x / 52, landWarp.y / 52, 3, 2.1, 0.6);
            const biomeDetail = valueNoise(seed + 431, x / 10, y / 10, 1);
            const biomeNoise = lerp(biomeBase, biomeDetail, 0.3);

            landScores.push({
                i,
                moisture,
                biomeNoise,
                scores: {
                    desert: (1 - moisture) * 0.75 + biomeNoise * 0.12,
                    swamp: moisture + (0.4 - Math.abs(biomeNoise - 0.4)) * 0.25,
                    forest: biomeNoise + moisture * 0.25
                }
            });
        }
    }

    coastScores.sort((a, b) => a.score - b.score);
    const waterCut = targetWater - 1 >= 0 ? coastScores[targetWater - 1]?.score ?? coastScores[coastScores.length - 1].score : -Infinity;
    const sandCut = targetWater + targetSand - 1 >= 0 ? coastScores[targetWater + targetSand - 1]?.score ?? coastScores[coastScores.length - 1].score : waterCut;

    for (const c of coastScores) {
        if (c.score <= waterCut) {
            tiles[c.i] = { id: "water" };
        } else if (c.score <= sandCut) {
            tiles[c.i] = { id: "sand" };
        }
    }

    const remainingLand = landScores.filter(({ i }) => !tiles[i]);

    const assignBiome = (entries: typeof remainingLand, target: number, kind: WorldTileId, accessor: (s: LandScores) => number) => {
        const sorted = [...entries].sort((a, b) => accessor(b.scores) - accessor(a.scores));
        for (let k = 0; k < Math.min(target, sorted.length); k++) {
            tiles[sorted[k].i] = { id: kind };
        }
        return sorted.slice(Math.min(target, sorted.length));
    };

    let pool = remainingLand;
    pool = assignBiome(pool, targetDesert, "desert", (s) => s.desert);
    pool = assignBiome(pool, targetSwamp, "swamp", (s) => s.swamp);
    pool = assignBiome(pool, targetForest, "forest", (s) => s.forest);
    pool = assignBiome(pool, targetMeadow, "meadow", () => 0.5);

    for (const rest of pool) {
        const patch = hash2D(seed + 999, rest.i, rest.i * 3);
        const id: WorldTileId = patch > 0.9 ? "rock" : patch > 0.75 ? "dirt" : "grass";
        tiles[rest.i] = { id };
    }

    carveRiver(tiles, width, height, coastSide, coastBandMap, landScores, rng);
    ensureLake(tiles, width, height, coastBandMap, landScores);

    limitBiomeRegions(tiles, width, height, "desert", 3);
    limitBiomeRegions(tiles, width, height, "swamp", 3);
    limitBiomeRegions(tiles, width, height, "forest", 3);
    limitBiomeRegions(tiles, width, height, "meadow", 3);

    return {
        width,
        height,
        tiles,
        waterLevel: 0.32
    };
}
