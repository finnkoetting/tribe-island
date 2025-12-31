"use client";

import type React from "react";
import type { StaticImageData } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import { getBuildingSize, getFootprintTopLeft } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, Vec2, WorldTileId } from "../../src/game/types/GameState";
import desertTile1 from "../../src/ui/game/textures/terrain/desert/1.png";
import desertTile2 from "../../src/ui/game/textures/terrain/desert/2.png";
import forestTile1 from "../../src/ui/game/textures/terrain/forest/1.png";
import forestTile2 from "../../src/ui/game/textures/terrain/forest/2.png";
import forestTile3 from "../../src/ui/game/textures/terrain/forest/3.png";
import meadowTile1 from "../../src/ui/game/textures/terrain/meadow/1.png";
import meadowTile2 from "../../src/ui/game/textures/terrain/meadow/2.png";
import meadowTile3 from "../../src/ui/game/textures/terrain/meadow/3.png";
import mountainTile1 from "../../src/ui/game/textures/terrain/mountain/1.png";
import mountainTile2 from "../../src/ui/game/textures/terrain/mountain/2.png";
import mountainTile3 from "../../src/ui/game/textures/terrain/mountain/3.png";
import waterTile2 from "../../src/ui/game/textures/terrain/water/2.png";
import waterTile3 from "../../src/ui/game/textures/terrain/water/3.png";
import waterTile1 from "../../src/ui/game/textures/terrain/water/1.png";
import { getTextureBitmap, preloadTextures } from "../../src/ui/game/textures/loader";

const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DEG2RAD = Math.PI / 180;
const MAX_DPR = 1.5;
const MIN_ZOOM = 1.3;
const ANIMAL_DETAIL_Z = 1.08;

const TILE_COLORS: Record<WorldTileId, string> = {
    water: "#6cd4ff",
    sand: "#f4d57b",
    rock: "#a2a8b5",
    mountain: "#7a6d86",
    dirt: "#d7a46a",
    grass: "#9adf7f",
    forest: "#63a66b",
    meadow: "#b7f29a",
    desert: "#f1c06b"
};

const TILE_TEXTURE_SOURCES: Record<WorldTileId, StaticImageData[]> = {
    water: [waterTile1, waterTile2, waterTile3],
    sand: [desertTile1, desertTile2],
    rock: [mountainTile1, mountainTile2, mountainTile3],
    mountain: [mountainTile1, mountainTile2, mountainTile3],
    dirt: [meadowTile1, meadowTile2, meadowTile3],
    grass: [meadowTile1, meadowTile2, meadowTile3],
    forest: [forestTile1, forestTile2, forestTile3],
    meadow: [meadowTile1, meadowTile2, meadowTile3],
    desert: [desertTile1, desertTile2]
};

import { BUILDING_COLORS, UI_THEME as THEME } from "../../src/ui/theme";

const VILLAGER_COLOR = "#1f2937";
const ANIMAL_STYLES = {
    sheep: { body: "#f7f3e5", head: "#d8cfb6", outline: "rgba(0,0,0,0.35)" },
    cow: { body: "#d9c6a8", head: "#b39369", outline: "rgba(0,0,0,0.38)" }
} as const;

type Camera = { x: number; y: number; z: number };
type DragState = { active: boolean; startX: number; startY: number; camX: number; camY: number };
type AmbientAnimal = {
    id: string;
    kind: keyof typeof ANIMAL_STYLES;
    anchor: Vec2;
    wanderRadius: number;
    strideMs: number;
    phaseMs: number;
    seed: number;
};

type TileTextureMap = Partial<Record<WorldTileId, ImageBitmap[]>>;

export type WorldCanvasProps = {
    st: GameState;
    buildMode: BuildingTypeId | null;
    onTileClick: (pos: Vec2) => void;
    onHover?: (pos: Vec2 | null) => void;
    onCancelBuild?: () => void;
    onCollectBuilding?: (id: string) => void;
    onFpsUpdate?: (fps: number) => void;
    initialCamera?: Camera;
    onCameraChange?: (cam: Camera) => void;
    onDragActive?: (active: boolean) => void;
};

export default function WorldCanvas({ st, buildMode, onTileClick, onHover, onCancelBuild, onCollectBuilding, onFpsUpdate, initialCamera, onCameraChange, onDragActive }: WorldCanvasProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const spaceDownRef = useRef(false);

    const [hoverTile, setHoverTile] = useState<Vec2 | null>(null);
    const [cam, setCam] = useState<Camera>(initialCamera ?? { x: 0, y: 0, z: 1 });
    const initialCamApplied = useRef<boolean>(false);
    const [drag, setDrag] = useState<DragState>({ active: false, startX: 0, startY: 0, camX: 0, camY: 0 });

    useEffect(() => {
        onDragActive?.(drag.active);
    }, [drag.active, onDragActive]);
    const [viewSize, setViewSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [tileTextures, setTileTextures] = useState<TileTextureMap | null>(null);
    const [treeTextures, setTreeTextures] = useState<ImageBitmap[] | null>(null);
    const [rockTextures, setRockTextures] = useState<ImageBitmap[] | null>(null);
    const [villagerTextures, setVillagerTextures] = useState<{
        male?: ImageBitmap | null;
        female?: ImageBitmap | null;
        default?: ImageBitmap | null;
    } | null>(null);
    const [cowTexture, setCowTexture] = useState<ImageBitmap | null>(null);
    const [sheepTexture, setSheepTexture] = useState<ImageBitmap | null>(null);
    const [dogTexture, setDogTexture] = useState<ImageBitmap | null>(null);
    const [berryBushTexture, setBerryBushTexture] = useState<ImageBitmap | null>(null);
    const [mushroomTextures, setMushroomTextures] = useState<ImageBitmap[] | null>(null);
    const [campfireTexture, setCampfireTexture] = useState<ImageBitmap | null>(null);
    const [campfireLvl2Texture, setCampfireLvl2Texture] = useState<ImageBitmap | null>(null);
    const [campfireLvl3Texture, setCampfireLvl3Texture] = useState<ImageBitmap | null>(null);
    const [collectorTexture, setCollectorTexture] = useState<ImageBitmap | null>(null);
    const fpsFrames = useRef(0);
    const fpsLast = useRef(0);

    useEffect(() => {
        if (typeof performance !== "undefined") fpsLast.current = performance.now();
    }, []);

    const angleDeg = 0;

    const worldPx = useMemo(() => {
        const angle = angleDeg * DEG2RAD;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const w = (st.world.width + st.world.height) * HALF_W;
        const h = (st.world.width + st.world.height) * HALF_H;
        const originX = st.world.height * HALF_W;
        const originY = 0;

        return { w, h, originX, originY, cosA, sinA };
    }, [st.world.width, st.world.height]);

    const canPlaceHover = !!(buildMode && hoverTile && canPlaceAt(st, hoverTile, buildMode));
    const meadowAnimals = useMemo(() => createMeadowAnimals(st.world, st.seed), [st.seed, st.world]);

    useEffect(() => {
        let cancelled = false;

        const loadTextures = async () => {
            try {
                const entries = await Promise.all(
                    (Object.entries(TILE_TEXTURE_SOURCES) as Array<[WorldTileId, StaticImageData[]]>).map(async ([id, srcs]) => {
                        const bitmaps = await Promise.all(srcs.map((s) => loadImageBitmap(resolveImageSrc(s))));
                        return [id, bitmaps] as const;
                    })
                );

                if (!cancelled) setTileTextures(Object.fromEntries(entries) as TileTextureMap);
            } catch (err) {
                console.warn("Failed to load tile textures", err);
            }
        };

        loadTextures();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getTextureBitmap("objects/tree/1"), getTextureBitmap("objects/tree/2")])
            .then((bmps) => {
                if (cancelled) return;
                const valid = bmps.filter((b): b is ImageBitmap => Boolean(b));
                if (valid.length) setTreeTextures(valid);
            })
            .catch((err) => console.warn("Failed to load tree textures", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getTextureBitmap("objects/stone/1"), getTextureBitmap("objects/stone/2"), getTextureBitmap("objects/stone/3")])
            .then((bmps) => {
                if (cancelled) return;
                const valid = bmps.filter((b): b is ImageBitmap => Boolean(b));
                if (valid.length) setRockTextures(valid);
            })
            .catch((err) => console.warn("Failed to load rock textures", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getTextureBitmap("objects/villager/female/1"),
            getTextureBitmap("objects/villager/male/1"),
            getTextureBitmap("objects/villager")
        ])
            .then(([femaleBmp, maleBmp, defBmp]) => {
                if (cancelled) return;
                const obj: { male?: ImageBitmap | null; female?: ImageBitmap | null; default?: ImageBitmap | null } = {};
                if (femaleBmp) obj.female = femaleBmp;
                if (maleBmp) obj.male = maleBmp;
                if (defBmp) obj.default = defBmp;
                if (Object.keys(obj).length) setVillagerTextures(obj);
            })
            .catch((err) => console.warn("Failed to load villager textures", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("objects/cow")
            .then((bmp) => {
                if (!cancelled && bmp) setCowTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load cow texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("objects/sheep")
            .then((bmp) => {
                if (!cancelled && bmp) setSheepTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load sheep texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("objects/dog")
            .then((bmp) => {
                if (!cancelled && bmp) setDogTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load dog texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("objects/berrybush")
            .then((bmp) => {
                if (!cancelled && bmp) setBerryBushTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load berry bush texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getTextureBitmap("objects/mushroom/1"), getTextureBitmap("objects/mushroom/2"), getTextureBitmap("objects/mushroom/3")])
            .then((bmps) => {
                if (cancelled) return;
                const valid = bmps.filter((b): b is ImageBitmap => Boolean(b));
                if (valid.length) setMushroomTextures(valid);
            })
            .catch((err) => console.warn("Failed to load mushroom textures", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("buildings/campfire/lvl1")
            .then((bmp) => {
                if (!cancelled && bmp) setCampfireTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load campfire texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("buildings/campfire/lvl2")
            .then((bmp) => {
                if (!cancelled && bmp) setCampfireLvl2Texture(bmp);
            })
            .catch((err) => console.warn("Failed to load campfire lvl2 texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("buildings/campfire/lvl3")
            .then((bmp) => {
                if (!cancelled && bmp) setCampfireLvl3Texture(bmp);
            })
            .catch((err) => console.warn("Failed to load campfire lvl3 texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getTextureBitmap("buildings/gather_hut/lvl1")
            .then((bmp) => {
                if (!cancelled && bmp) setCollectorTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load collector hut texture", err));
        return () => {
            cancelled = true;
        };
    }, []);

    const minZoomForViewport = useCallback(
        (vw: number, vh: number) => Math.max(MIN_ZOOM, Math.max(vw / worldPx.w, vh / worldPx.h) * 1.08),
        [worldPx.w, worldPx.h]
    );

    const clampCam = useCallback(
        (next: Camera, vw: number, vh: number) => {
            const minZ = minZoomForViewport(vw, vh);
            const z = Math.max(minZ, Math.min(2.5, next.z));
            const maxX = Math.max(0, worldPx.w - vw / z);
            const maxY = Math.max(0, worldPx.h - vh / z);
            const x = Math.max(0, Math.min(maxX, next.x));
            const y = Math.max(0, Math.min(maxY, next.y));
            return { x, y, z };
        },
        [minZoomForViewport, worldPx.w, worldPx.h]
    );

    const resize = useCallback(() => {
        const wrap = wrapRef.current;
        const c = canvasRef.current;
        if (!wrap || !c) return;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const r = wrap.getBoundingClientRect();
        const w = Math.max(1, Math.floor(r.width));
        const h = Math.max(1, Math.floor(r.height));

        const bw = Math.floor(w * dpr);
        const bh = Math.floor(h * dpr);

        if (c.width !== bw || c.height !== bh) {
            c.width = bw;
            c.height = bh;
            c.style.width = `${w}px`;
            c.style.height = `${h}px`;
        }

        setCam((prev) => clampCam(prev, w, h));
        setViewSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    }, [clampCam]);

    useEffect(() => {
        resize();
        const wrap = wrapRef.current;
        if (!wrap) return;
        const ro = new ResizeObserver(() => resize());
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [resize]);

    useEffect(() => {
        resize();
    }, [resize, st.world.width, st.world.height]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));

        setCam((prev) => {
            const hasInitial = Boolean(initialCamera) && !initialCamApplied.current;
            const target = hasInitial ? initialCamera! : prev;
            initialCamApplied.current = hasInitial || initialCamApplied.current;
            return clampCam(target, vw, vh);
        });
    }, [clampCam, worldPx.w, worldPx.h, initialCamera]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") spaceDownRef.current = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") spaceDownRef.current = false;
        };
        const onBlur = () => {
            spaceDownRef.current = false;
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && buildMode) onCancelBuild?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [buildMode, onCancelBuild]);

    useEffect(() => {
        const c = canvasRef.current;
        const wrap = wrapRef.current;
        if (!c || !wrap) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, vw, vh);
        ctx.imageSmoothingEnabled = false;

        const viewW = vw / cam.z;
        const viewH = vh / cam.z;
        const corners = [
            { wx: cam.x, wy: cam.y },
            { wx: cam.x + viewW, wy: cam.y },
            { wx: cam.x, wy: cam.y + viewH },
            { wx: cam.x + viewW, wy: cam.y + viewH }
        ];

        const gridCorners = corners.map((p) => worldToGrid(p.wx, p.wy, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA));
        const showAnimals = cam.z >= ANIMAL_DETAIL_Z;
        const margin = 1;
        const minX = Math.max(0, Math.floor(Math.min(...gridCorners.map((g) => g.gx))) - margin);
        const maxX = Math.min(st.world.width - 1, Math.ceil(Math.max(...gridCorners.map((g) => g.gx))) + margin);
        const minY = Math.max(0, Math.floor(Math.min(...gridCorners.map((g) => g.gy))) - margin);
        const maxY = Math.min(st.world.height - 1, Math.ceil(Math.max(...gridCorners.map((g) => g.gy))) + margin);

        ctx.save();
        ctx.translate(-cam.x * cam.z, -cam.y * cam.z);
        ctx.scale(cam.z, cam.z);

        drawTiles(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, minX, maxX, minY, maxY, tileTextures);
        drawBuildings(
            ctx,
            st,
            worldPx.originX,
            worldPx.originY,
            worldPx.cosA,
            worldPx.sinA,
            treeTextures,
            rockTextures,
            berryBushTexture,
            mushroomTextures,
            campfireTexture,
            campfireLvl2Texture,
            campfireLvl3Texture,
            collectorTexture
        );
        if (showAnimals) drawAnimals(ctx, meadowAnimals, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, cowTexture, sheepTexture);
        if (showAnimals) drawGameAnimals(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, dogTexture);
        drawVillagers(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, villagerTextures);

        drawOverlays(ctx, st, hoverTile, buildMode, canPlaceHover, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        ctx.restore();

        fpsFrames.current += 1;
        const now = typeof performance !== "undefined" ? performance.now() : 0;
        const elapsed = now - fpsLast.current;
        if (elapsed >= 400) {
            const nextFps = elapsed > 0 ? (fpsFrames.current * 1000) / elapsed : 0;
            fpsFrames.current = 0;
            fpsLast.current = now;
            onFpsUpdate?.(nextFps);
        }
    }, [
        st,
        hoverTile,
        buildMode,
        canPlaceHover,
        cam,
        worldPx.originX,
        worldPx.originY,
        worldPx.cosA,
        worldPx.sinA,
        meadowAnimals,
        tileTextures,
        treeTextures,
        rockTextures,
        villagerTextures,
        berryBushTexture,
        mushroomTextures,
        campfireTexture,
        collectorTexture,
        cowTexture,
        sheepTexture,
        onFpsUpdate
    ]);

    const screenToWorld = (clientX: number, clientY: number) => {
        const wrap = wrapRef.current;
        if (!wrap) return null;
        const r = wrap.getBoundingClientRect();
        const sx = clientX - r.left;
        const sy = clientY - r.top;
        return { wx: cam.x + sx / cam.z, wy: cam.y + sy / cam.z };
    };

    const getTileFromClient = (clientX: number, clientY: number): Vec2 | null => {
        const p = screenToWorld(clientX, clientY);
        if (!p) return null;

        const ixRot = (p.wx - worldPx.originX) / HALF_W;
        const iyRot = (p.wy - worldPx.originY) / HALF_H;

        const ix = ixRot * worldPx.cosA + iyRot * worldPx.sinA;
        const iy = -ixRot * worldPx.sinA + iyRot * worldPx.cosA;

        const gx = (ix + iy) / 2;
        const gy = (iy - ix) / 2;

        const baseX = Math.floor(gx);
        const baseY = Math.floor(gy);

        const candidates: Vec2[] = [
            { x: baseX, y: baseY },
            { x: baseX + 1, y: baseY },
            { x: baseX - 1, y: baseY },
            { x: baseX, y: baseY + 1 },
            { x: baseX, y: baseY - 1 },
            { x: baseX + 1, y: baseY - 1 },
            { x: baseX - 1, y: baseY + 1 },
            { x: baseX + 1, y: baseY + 1 },
            { x: baseX - 1, y: baseY - 1 }
        ];

        for (const c of candidates) {
            if (c.x < 0 || c.y < 0 || c.x >= st.world.width || c.y >= st.world.height) continue;

            const { sx, sy } = tileToScreen(c.x, c.y, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);
            const dx = p.wx - (sx + HALF_W);
            const dy = p.wy - (sy + HALF_H);

            // Diamond hit-test: inside if normalized manhattan distance fits.
            const inside = Math.abs(dx) / HALF_W + Math.abs(dy) / HALF_H <= 1;
            if (inside) return c;
        }

        return null;
    };

    const startPan = (clientX: number, clientY: number) => {
        setDrag({ active: true, startX: clientX, startY: clientY, camX: cam.x, camY: cam.y });
    };

    const movePan = (clientX: number, clientY: number) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));

        const dx = (clientX - drag.startX) / cam.z;
        const dy = (clientY - drag.startY) / cam.z;

        setCam((prev) => clampCam({ x: drag.camX - dx, y: drag.camY - dy, z: prev.z }, vw, vh));
    };

    const handleMove = (ev: React.MouseEvent) => {
        if (drag.active) {
            movePan(ev.clientX, ev.clientY);
            return;
        }
        const tile = getTileFromClient(ev.clientX, ev.clientY);
        setHoverTile(tile);
        onHover?.(tile);
    };

    const handleLeave = () => {
        setHoverTile(null);
        onHover?.(null);
    };

    const handleMouseDown = (ev: React.MouseEvent) => {
        // Pan with right mouse button, or with space+left click.
        if (ev.button === 2 || (ev.button === 0 && spaceDownRef.current)) {
            ev.preventDefault();
            startPan(ev.clientX, ev.clientY);
            return;
        }

        // Left click => pick/place/select tile/building
        if (ev.button === 0) {
            const tile = getTileFromClient(ev.clientX, ev.clientY);
            if (!tile) return;

            if (buildMode && !canPlaceAt(st, tile, buildMode)) return;
            onTileClick(tile);
        }
    };

    const handleMouseUp = () => {
        if (drag.active) setDrag((d) => ({ ...d, active: false }));
    };

    const handleContextMenu = (ev: React.MouseEvent) => {
        ev.preventDefault();
        if (buildMode) onCancelBuild?.();
    };

    const handleWheel = (ev: React.WheelEvent) => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));

        const mx = ev.clientX - r.left;
        const my = ev.clientY - r.top;

        const beforeX = cam.x + mx / cam.z;
        const beforeY = cam.y + my / cam.z;

        const dir = ev.deltaY > 0 ? 0.9 : 1.1;
        const minZ = minZoomForViewport(vw, vh);
        const nextZ = Math.max(minZ, Math.min(2.5, cam.z * dir));

        const nextX = beforeX - mx / nextZ;
        const nextY = beforeY - my / nextZ;

        setCam((prev) => clampCam({ x: nextX, y: nextY, z: nextZ }, vw, vh));
    };

    const cursor = drag.active ? "grabbing" : buildMode ? (canPlaceHover ? "pointer" : "not-allowed") : "default";

    useEffect(() => {
        if (onCameraChange) onCameraChange(cam);
    }, [cam, onCameraChange]);

    const buildingOverlays = useMemo(() => {
        if (!viewSize.w || !viewSize.h) return [] as Array<{ id: string; type: BuildingTypeId; x: number; y: number; progress: number; collectable: boolean; blocked: boolean; output: GameState["buildings"][string]["output"] | null }>;

        const vw = viewSize.w;
        const vh = viewSize.h;
        const margin = 80;

        return Object.values(st.buildings)
            .filter((b) =>
                b.task.kind !== "none" &&
                b.type !== "road" &&
                b.type !== "rock" &&
                b.type !== "tree" &&
                b.type !== "berry_bush" &&
                b.type !== "mushroom"
            )
            .map((b) => {
                const size = getBuildingSize(b.type);
                const anchorX = b.pos.x + size.w / 2;
                const anchorY = b.pos.y + size.h / 2;
                const { sx, sy } = tileToScreen(anchorX, anchorY, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

                // Use tile center as reference and nudge upward relative to footprint height for better alignment.
                const centerX = sx + HALF_W;
                const centerY = sy + HALF_H;

                const yOffsetTiles = Math.max(0.8, size.h * 0.75);
                const yOffsetPx = yOffsetTiles * HALF_H + 25;

                // For non-square footprints, compensate X so the bar stays centered visually.
                const xOffsetTiles = (size.w - size.h) * 0.5 + .1;
                const xOffsetPx = xOffsetTiles * HALF_W;

                const px = ((centerX + xOffsetPx) - cam.x) * cam.z;
                const py = ((centerY - yOffsetPx) - cam.y) * cam.z;
                return { b, px, py };
            })
            .filter((entry) => entry.px >= -margin && entry.px <= vw + margin && entry.py >= -margin && entry.py <= vh + margin)
            .map((entry) => {
                const b = entry.b;
                const progressRaw = (b.task.progress / Math.max(1, b.task.duration)) * 100;
                const progress = Math.max(0, Math.min(100, Math.round(progressRaw)));
                return {
                    id: b.id,
                    type: b.type,
                    x: entry.px,
                    y: entry.py,
                    progress,
                    collectable: b.task.collectable && Boolean(b.output),
                    blocked: b.task.blocked,
                    output: b.output ?? null
                };
            });
    }, [st.buildings, cam.x, cam.y, cam.z, viewSize.w, viewSize.h, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA]);

    return (
        <div
            ref={wrapRef}
            onMouseLeave={handleLeave}
            onMouseMove={handleMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
            style={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                borderRadius: 12,
                cursor,
                userSelect: "none"
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    imageRendering: "auto"
                }}
            />

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {buildingOverlays.map(card => {
                    const color = BUILDING_COLORS[card.type] || "#f97316";
                    const barColor = card.blocked ? "#ef4444" : color;
                    const showProgress = !card.collectable;
                    const showCollectIcon = card.collectable && Boolean(onCollectBuilding);

                    const uiScale = Math.max(0.55, Math.min(1.4, cam.z));

                    // Keep overlay UI at a constant on-screen size (not affected by camera zoom).
                    const barWidth = 75 * uiScale;
                    const barHeight = 8 * uiScale;
                    const barPadding = 1 * uiScale;
                    const borderPx = Math.max(0.75, 1 * uiScale);

                    if (!showProgress && !showCollectIcon) return null;

                    return (
                        <div
                            key={card.id}
                            style={{
                                position: "absolute",
                                left: card.x,
                                top: card.y,
                                transform: "translate(-50%, -140%)",
                                pointerEvents: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            {showProgress && (
                                <div
                                    style={{
                                        position: "relative",
                                        width: barWidth,
                                        height: barHeight,
                                        borderRadius: 999,
                                        padding: barPadding,
                                        background: "linear-gradient(180deg, rgba(255,248,235,0.95) 0%, rgba(255,231,200,0.92) 100%)",
                                        border: `${borderPx}px solid ${applyAlpha(color, 0.55)}`,
                                        boxShadow: THEME.panelShadow,
                                        overflow: "hidden"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${card.progress}%`,
                                            height: "100%",
                                            borderRadius: 999,
                                            background: `linear-gradient(90deg, ${applyAlpha(barColor, 0.85)} 0%, ${barColor} 60%, ${applyAlpha(barColor, 0.9)} 100%)`,
                                            boxShadow: `inset 0 0 0 1px ${applyAlpha("#000000", 0.12)}`,
                                            transition: "width 0.2s ease"
                                        }}
                                    />
                                    <div
                                        aria-hidden
                                        style={{
                                            position: "absolute",
                                            inset: 1,
                                            borderRadius: 999,
                                            background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)"
                                        }}
                                    />
                                </div>
                            )}

                            {showCollectIcon && (
                                <button
                                    aria-label="Einsammeln"
                                    onClick={e => {
                                        e.stopPropagation();
                                        onCollectBuilding?.(card.id);
                                    }}
                                    style={{
                                        pointerEvents: "auto",
                                        display: "grid",
                                        placeItems: "center",
                                        width: 46,
                                        height: 46,
                                        borderRadius: 12,
                                        marginTop: -4,
                                        border: "none",
                                        background: "linear-gradient(135deg, #fff7ed, #ffe4e6)",
                                        boxShadow: "0 10px 22px rgba(0,0,0,0.28)",
                                        cursor: "pointer"
                                    }}
                                >
                                    <BerryIcon size={30} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BerryIcon({ size = 32 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            focusable="false"
        >
            <circle cx="22" cy="26" r="12" fill="#9d174d" stroke="#7f1d1d" strokeWidth="2" />
            <circle cx="26" cy="22" r="10" fill="#be185d" opacity="0.9" />
            <circle cx="19" cy="21" r="6" fill="rgba(255,255,255,0.18)" />
            <path d="M26 14c4-5 10-6 12-3-3 1-6 5-7 9" fill="#22c55e" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function resolveImageSrc(src: StaticImageData | string): string {
    return typeof src === "string" ? src : src.src;
}

function loadImageBitmap(src: string): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            createImageBitmap(img)
                .then(resolve)
                .catch((err) => reject(err));
        };
        img.onerror = () => reject(new Error(`Failed to load texture ${src}`));
    });
}

function worldToGrid(wx: number, wy: number, originX: number, originY: number, cosA: number, sinA: number) {
    const ixRot = (wx - originX) / HALF_W;
    const iyRot = (wy - originY) / HALF_H;

    const ix = ixRot * cosA + iyRot * sinA;
    const iy = -ixRot * sinA + iyRot * cosA;

    const gx = (ix + iy) / 2;
    const gy = (iy - ix) / 2;

    return { gx, gy };
}

function projectIso(x: number, y: number, originX: number, originY: number, cosA: number, sinA: number) {
    const ix = x - y;
    const iy = x + y;
    const rx = ix * cosA - iy * sinA;
    const ry = ix * sinA + iy * cosA;
    const sx = rx * HALF_W + originX;
    const sy = ry * HALF_H + originY;
    return { sx, sy };
}

function tileToScreen(x: number, y: number, originX: number, originY: number, cosA: number, sinA: number) {
    return projectIso(x, y, originX, originY, cosA, sinA);
}

function drawTileDiamond(ctx: CanvasRenderingContext2D, sx: number, sy: number, fill: string, stroke: string, shadow: string) {
    ctx.beginPath();
    ctx.moveTo(sx, sy + HALF_H);
    ctx.lineTo(sx + HALF_W, sy);
    ctx.lineTo(sx + TILE_W, sy + HALF_H);
    ctx.lineTo(sx + HALF_W, sy + TILE_H);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    const grad = ctx.createLinearGradient(sx, sy + HALF_H, sx, sy + TILE_H);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, shadow);
    ctx.fillStyle = grad;
    ctx.fill();
}

function drawAnimals(
    ctx: CanvasRenderingContext2D,
    animals: AmbientAnimal[],
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    cowTexture: ImageBitmap | null,
    sheepTexture: ImageBitmap | null
) {
    if (!animals.length) return;

    const timeMs = st.nowMs;

    for (const animal of animals) {
        const pos = animalPosition(animal, timeMs, st.world);
        const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
        const cx = sx + HALF_W;
        const cy = sy + HALF_H * 0.6;

        if (animal.kind === "cow" && cowTexture) {
            drawIsoSprite(ctx, cowTexture, sx, sy, { heightScale: 0.85, widthScale: 0.8, offsetY: -1 });
            continue;
        }

        if (animal.kind === "sheep" && sheepTexture) {
            drawIsoSprite(ctx, sheepTexture, sx, sy, { heightScale: 0.75, widthScale: 0.8, offsetY: -1 });
            continue;
        }

        const style = ANIMAL_STYLES[animal.kind];
        const bodyR = animal.kind === "cow" ? 3.5 : 3;
        const bodySquish = animal.kind === "cow" ? 0.76 : 0.7;

        ctx.fillStyle = style.body;
        ctx.strokeStyle = style.outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, bodyR, bodyR * bodySquish, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = style.head;
        ctx.beginPath();
        ctx.ellipse(cx + bodyR * 0.65, cy - bodyR * 0.15, bodyR * 0.45, bodyR * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animalPosition(animal: AmbientAnimal, timeMs: number, world: GameState["world"]): Vec2 {
    const stride = animal.strideMs;
    const shifted = timeMs + animal.phaseMs;
    const segment = Math.floor(shifted / stride);
    const t = (shifted % stride) / stride;

    const from = sampleAnimalWaypoint(animal, segment, world);
    const to = sampleAnimalWaypoint(animal, segment + 1, world);

    const eased = 0.5 - 0.5 * Math.cos(Math.min(1, Math.max(0, t)) * Math.PI);
    return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
    };
}

function sampleAnimalWaypoint(animal: AmbientAnimal, segment: number, world: GameState["world"]): Vec2 {
    for (let attempt = 0; attempt < 4; attempt++) {
        const angle = hashFloat(animal.seed + segment * 37, attempt, 11) * Math.PI * 2;
        const radius = 0.6 + hashFloat(animal.seed + segment * 53, attempt, 29) * animal.wanderRadius;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius * 0.85;
        const candidate = { x: animal.anchor.x + dx, y: animal.anchor.y + dy };
        if (isMeadowTile(world, candidate)) return candidate;
    }
    return animal.anchor;
}

function isMeadowTile(world: GameState["world"], pos: Vec2): boolean {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
    const tile = world.tiles[y * world.width + x];
    return tile?.id === "meadow";
}

function hashFloat(seed: number, a: number, b: number): number {
    // Lightweight xorshift mix to spread bits across the full 32-bit range
    let t = seed ^ (a * 374761393) ^ (b * 668265263);
    t ^= t << 13;
    t ^= t >>> 17;
    t ^= t << 5;
    return (t >>> 0) / 4294967296;
}

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let n = t;
        n = Math.imul(n ^ (n >>> 15), 1 | n);
        n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
        return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
}

function createMeadowAnimals(world: GameState["world"], seed: number): AmbientAnimal[] {
    const meadowTiles: Vec2[] = [];

    for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
            const tile = world.tiles[y * world.width + x];
            if (tile?.id === "meadow") meadowTiles.push({ x, y });
        }
    }

    if (!meadowTiles.length) return [];

    const rng = mulberry32(seed ^ 0x51c0ffee);
    const desired = Math.max(4, Math.min(12, Math.floor(meadowTiles.length / 140)));
    const animals: AmbientAnimal[] = [];
    let attempts = 0;

    while (animals.length < desired && meadowTiles.length && attempts < meadowTiles.length * 3) {
        attempts++;
        const pickIdx = Math.floor(rng() * meadowTiles.length);
        const tile = meadowTiles.splice(pickIdx, 1)[0];

        const anchor = { x: tile.x + 0.2 + rng() * 0.6, y: tile.y + 0.2 + rng() * 0.6 };
        const tooClose = animals.some((a) => distanceSq(a.anchor, anchor) < 3.5);
        if (tooClose) continue;

        animals.push({
            id: `animal_${animals.length}_${tile.x}_${tile.y}`,
            kind: rng() < 0.58 ? "sheep" : "cow",
            anchor,
            wanderRadius: 1.4 + rng() * 2.4,
            strideMs: 5200 + rng() * 4300,
            phaseMs: Math.floor(rng() * 5000),
            seed: Math.floor(rng() * 0xffffffff)
        });
    }

    return animals;
}

function drawTiles(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    textures: TileTextureMap | null
) {
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const tile = st.world.tiles[y * st.world.width + x];
            if (!tile) continue;
            const { sx, sy } = tileToScreen(x, y, originX, originY, cosA, sinA);
            const texList = textures?.[tile.id];
            if (texList?.length) {
                const pick = texList.length === 1 ? 0 : Math.floor(hashFloat(st.seed, x + 7, y + 13) * texList.length) % texList.length;
                const tex = texList[pick];
                const dx = Math.round(sx);
                const dy = Math.round(sy);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(dx, dy + HALF_H);
                ctx.lineTo(dx + HALF_W, dy);
                ctx.lineTo(dx + TILE_W, dy + HALF_H);
                ctx.lineTo(dx + HALF_W, dy + TILE_H);
                ctx.closePath();
                ctx.clip();

                // Map square texture onto the diamond without cropping by using an affine transform
                // that sends square corners to the diamond corners.
                ctx.translate(dx + HALF_W, dy + HALF_H);
                ctx.transform(0.5, -0.25, 0.5, 0.25, 0, 0);
                ctx.drawImage(tex, -HALF_W, -HALF_W, TILE_W, TILE_W);

                ctx.restore();
                continue;
            }
            const base = TILE_COLORS[tile.id] || "#7ea";
            drawTileDiamond(ctx, sx, sy, base, "rgba(0,0,0,0.2)", "rgba(0,0,0,0.12)");
        }
    }
}

function drawBuildings(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    treeTextures: ImageBitmap[] | null,
    rockTextures: ImageBitmap[] | null,
    berryBushTexture: ImageBitmap | null,
    mushroomTextures: ImageBitmap[] | null,
    campfireTexture: ImageBitmap | null,
    campfireLvl2Texture: ImageBitmap | null,
    campfireLvl3Texture: ImageBitmap | null,
    collectorTexture: ImageBitmap | null
) {
    const entries = Object.values(st.buildings);
    if (!entries.length) return;

    const roadSet = new Set(entries.filter((b) => b.type === "road").map((b) => `${b.pos.x},${b.pos.y}`));

    for (const b of entries) {
        if (b.type === "road") {
            drawRoadTile(ctx, b.pos, roadSet, originX, originY, cosA, sinA);
            continue;
        }

        if (b.type === "rock") {
            const idx = b.variant && rockTextures ? Math.max(0, Math.min(rockTextures.length - 1, b.variant - 1)) : 0;
            const tex = rockTextures && rockTextures.length ? rockTextures[idx] : null;
            drawRockTile(ctx, b.pos, originX, originY, cosA, sinA, tex);
            continue;
        }

            if (b.type === "tree") {
                drawTreeTile(ctx, b.pos, originX, originY - 12.5, cosA, sinA, treeTextures, b.id);
            continue;
        }

        if (b.type === "berry_bush") {
            drawBushTile(ctx, b.pos, originX, originY, cosA, sinA, berryBushTexture);
            continue;
        }

        if (b.type === "mushroom") {
            const idx = b.variant && mushroomTextures ? Math.max(0, Math.min(mushroomTextures.length - 1, b.variant - 1)) : 0;
            const tex = mushroomTextures && mushroomTextures.length ? mushroomTextures[idx] : null;
            drawMushroomTile(ctx, b.pos, originX, originY - 10, cosA, sinA, tex);
            continue;
        }

        const size = getBuildingSize(b.type);
        const color = BUILDING_COLORS[b.type] || "#2e2e2e";

        if (b.type === "campfire") {
            drawFootprintShadow(ctx, b, originX, originY, cosA, sinA);

            const tex = b.level === 3 ? (campfireLvl3Texture ?? campfireLvl2Texture ?? campfireTexture) : b.level === 2 ? (campfireLvl2Texture ?? campfireTexture) : campfireTexture;

            if (tex) {
                const centerX = b.pos.x + size.w / 2;
                const centerY = b.pos.y + size.h / 2;
                const { sx, sy } = tileToScreen(centerX, centerY, originX, originY, cosA, sinA);
                drawIsoSprite(ctx, tex, sx, sy, { heightScale: 2, widthScale: 1.1, offsetY: -6 });
            }
            continue;
        }

        if (b.type === "gather_hut") {
            drawFootprintShadow(ctx, b, originX, originY, cosA, sinA);

            if (collectorTexture) {
                const centerX = b.pos.x + size.w / 2;
                const centerY = b.pos.y + size.h / 2;
                const { sx, sy } = tileToScreen(centerX, centerY, originX, originY, cosA, sinA);
                drawIsoSprite(ctx, collectorTexture, sx + 1, sy + 12, { heightScale: 2.6, widthScale: 1, offsetY: -10 });
            } else {
                fillBuildingFootprint(ctx, b, color, originX, originY, cosA, sinA);
            }
            continue;
        }

        fillBuildingFootprint(ctx, b, color, originX, originY, cosA, sinA);
    }
}

function drawFootprintShadow(
    ctx: CanvasRenderingContext2D,
    building: GameState["buildings"][string],
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
    const size = getBuildingSize(building.type);
    for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
            const tx = building.pos.x + dx;
            const ty = building.pos.y + dy;
            const { sx, sy } = tileToScreen(tx, ty, originX, originY, cosA, sinA);

            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.beginPath();
            ctx.moveTo(sx, sy + HALF_H);
            ctx.lineTo(sx + HALF_W, sy);
            ctx.lineTo(sx + TILE_W, sy + HALF_H);
            ctx.lineTo(sx + HALF_W, sy + TILE_H);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function fillBuildingFootprint(
    ctx: CanvasRenderingContext2D,
    building: GameState["buildings"][string],
    color: string,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
    const size = getBuildingSize(building.type);
    for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
            const tx = building.pos.x + dx;
            const ty = building.pos.y + dy;
            const { sx, sy } = tileToScreen(tx, ty, originX, originY, cosA, sinA);

            ctx.fillStyle = applyAlpha(color, 0.9);
            ctx.beginPath();
            ctx.moveTo(sx, sy + HALF_H);
            ctx.lineTo(sx + HALF_W, sy);
            ctx.lineTo(sx + TILE_W, sy + HALF_H);
            ctx.lineTo(sx + HALF_W, sy + TILE_H);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

function drawRoadTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    roadSet: Set<string>,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
    const k = (x: number, y: number) => `${x},${y}`;

    const hasTop = roadSet.has(k(pos.x, pos.y - 1));
    const hasRight = roadSet.has(k(pos.x + 1, pos.y));
    const hasBottom = roadSet.has(k(pos.x, pos.y + 1));
    const hasLeft = roadSet.has(k(pos.x - 1, pos.y));

    const roadW = 0.2;
    const low = -roadW;
    const high = roadW;

    const project = (lx: number, ly: number) =>
        tileToScreen(pos.x + lx + 1, pos.y + ly, originX, originY, cosA, sinA);

    const pTL = project(low, low);
    const pTR = project(high, low);
    const pBR = project(high, high);
    const pBL = project(low, high);

    const edgeT = [project(low, -0.5), project(high, -0.5)];
    const edgeR = [project(0.5, low), project(0.5, high)];
    const edgeB = [project(low, 0.5), project(high, 0.5)];
    const edgeL = [project(-0.5, low), project(-0.5, high)];

    ctx.fillStyle = BUILDING_COLORS.road || "#8d7355";
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pTL.sx, pTL.sy);

    if (hasTop) {
        ctx.lineTo(edgeT[0].sx, edgeT[0].sy);
        ctx.lineTo(edgeT[1].sx, edgeT[1].sy);
    }
    ctx.lineTo(pTR.sx, pTR.sy);

    if (hasRight) {
        ctx.lineTo(edgeR[0].sx, edgeR[0].sy);
        ctx.lineTo(edgeR[1].sx, edgeR[1].sy);
    }
    ctx.lineTo(pBR.sx, pBR.sy);

    if (hasBottom) {
        ctx.lineTo(edgeB[1].sx, edgeB[1].sy);
        ctx.lineTo(edgeB[0].sx, edgeB[0].sy);
    }
    ctx.lineTo(pBL.sx, pBL.sy);

    if (hasLeft) {
        ctx.lineTo(edgeL[1].sx, edgeL[1].sy);
        ctx.lineTo(edgeL[0].sx, edgeL[0].sy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();

    if (hasTop) {
        ctx.moveTo(edgeT[0].sx, edgeT[0].sy);
        ctx.lineTo(pTL.sx, pTL.sy);
    }
    if (hasLeft) {
        ctx.lineTo(edgeL[0].sx, edgeL[0].sy);
        ctx.moveTo(edgeL[1].sx, edgeL[1].sy);
        ctx.lineTo(pBL.sx, pBL.sy);
    } else {
        ctx.moveTo(pTL.sx, pTL.sy);
        ctx.lineTo(pBL.sx, pBL.sy);
    }
    if (hasBottom) ctx.lineTo(edgeB[0].sx, edgeB[0].sy);

    if (hasTop) {
        ctx.moveTo(edgeT[1].sx, edgeT[1].sy);
        ctx.lineTo(pTR.sx, pTR.sy);
    }
    if (hasRight) {
        ctx.lineTo(edgeR[0].sx, edgeR[0].sy);
        ctx.moveTo(edgeR[1].sx, edgeR[1].sy);
        ctx.lineTo(pBR.sx, pBR.sy);
    } else {
        ctx.moveTo(pTR.sx, pTR.sy);
        ctx.lineTo(pBR.sx, pBR.sy);
    }
    if (hasBottom) ctx.lineTo(edgeB[1].sx, edgeB[1].sy);

    if (!hasTop) { ctx.moveTo(pTL.sx, pTL.sy); ctx.lineTo(pTR.sx, pTR.sy); }
    if (!hasBottom) { ctx.moveTo(pBL.sx, pBL.sy); ctx.lineTo(pBR.sx, pBR.sy); }

    ctx.stroke();
}

type IsoSpriteOptions = {
    heightScale: number;
    widthScale?: number;
    offsetX?: number;
    offsetY?: number;
    flipX?: boolean;
};

function drawIsoSprite(
    ctx: CanvasRenderingContext2D,
    texture: ImageBitmap,
    sx: number,
    sy: number,
    { heightScale, widthScale, offsetX = 0, offsetY = 0, flipX = false }: IsoSpriteOptions
) {
    const ratio = texture.height > 0 ? texture.width / texture.height : 1;
    const targetH = TILE_H * heightScale;
    const targetW = targetH * ratio * (widthScale ?? 1);

    const dx = sx + HALF_W - targetW / 2 + offsetX;
    const dy = sy + TILE_H - targetH + offsetY;

    if (flipX) {
        ctx.save();
        ctx.translate(dx + targetW, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(texture, 0, 0, targetW, targetH);
        ctx.restore();
        return;
    }

    ctx.drawImage(texture, dx, dy, targetW, targetH);
}

function drawRockTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    rockTexture: ImageBitmap | null
) {
    const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);

    if (rockTexture) {
        drawIsoSprite(ctx, rockTexture, sx, sy, { heightScale: 0.95, widthScale: 0.9 });
        return;
    }

    const r = 0.24;
    const project = (lx: number, ly: number) => tileToScreen(pos.x + lx + 1, pos.y + ly, originX, originY, cosA, sinA);

    const pN = project(0, -r);
    const pE = project(r, 0);
    const pS = project(0, r);
    const pW = project(-r, 0);

    ctx.fillStyle = BUILDING_COLORS.rock || "#7b6858";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pN.sx, pN.sy);
    ctx.lineTo(pE.sx, pE.sy);
    ctx.lineTo(pS.sx, pS.sy);
    ctx.lineTo(pW.sx, pW.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawTreeTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    treeTextures: ImageBitmap[] | null,
    buildingId?: string
) {
    const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
    if (treeTextures && treeTextures.length) {
        const id = buildingId ?? `${pos.x},${pos.y}`;
        let h = 0;
        for (let i = 0; i < id.length; i++) {
            h = (h * 31 + id.charCodeAt(i)) >>> 0;
        }
        const idx = h % treeTextures.length;
        const tex = treeTextures[idx];
        drawIsoSprite(ctx, tex, sx, sy, { heightScale: 1.6, widthScale: 0.9 });
        return;
    }

    const r = 0.26;
    const project = (lx: number, ly: number) => tileToScreen(pos.x + lx + 1, pos.y + ly, originX, originY, cosA, sinA);

    const pN = project(0, -r * 1.2);
    const pE = project(r * 0.9, 0);
    const pS = project(0, r * 1.1);
    const pW = project(-r * 0.9, 0);

    ctx.fillStyle = BUILDING_COLORS.tree || "#3a6f3d";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pN.sx, pN.sy);
    ctx.lineTo(pE.sx, pE.sy);
    ctx.lineTo(pS.sx, pS.sy);
    ctx.lineTo(pW.sx, pW.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawBushTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    bushTexture: ImageBitmap | null
) {
    const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
    if (bushTexture) {
        drawIsoSprite(ctx, bushTexture, sx, sy, { heightScale: .9, widthScale: 0.9 });
        return;
    }

    const r = 0.18;
    const project = (lx: number, ly: number) => tileToScreen(pos.x + lx + 1, pos.y + ly, originX, originY, cosA, sinA);
    const pN = project(0, -r * 1.1);
    const pE = project(r * 0.9, 0);
    const pS = project(0, r * 1.05);
    const pW = project(-r * 0.9, 0);

    ctx.fillStyle = BUILDING_COLORS.tree || "#2f7f3a";
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pN.sx, pN.sy);
    ctx.lineTo(pE.sx, pE.sy);
    ctx.lineTo(pS.sx, pS.sy);
    ctx.lineTo(pW.sx, pW.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawMushroomTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    mushroomTexture: ImageBitmap | null
) {
    const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
    if (mushroomTexture) {
        drawIsoSprite(ctx, mushroomTexture, sx, sy, { heightScale: 0.55, widthScale: 0.92 });
        return;
    }

    const r = 0.12;
    const project = (lx: number, ly: number) => tileToScreen(pos.x + lx + 1, pos.y + ly, originX, originY, cosA, sinA);
    const pN = project(0, -r);
    const pE = project(r, 0);
    const pS = project(0, r * 1.1);
    const pW = project(-r, 0);

    ctx.fillStyle = "#b0514b";
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(pN.sx, pN.sy);
    ctx.lineTo(pE.sx, pE.sy);
    ctx.lineTo(pS.sx, pS.sy);
    ctx.lineTo(pW.sx, pW.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}


type CampfireAnchor = { pos: Vec2; key: string };

function distanceSq(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

function getCampfires(st: GameState): CampfireAnchor[] {
    return Object.values(st.buildings)
        .filter((b) => b.type === "campfire")
        .map((b) => {
            const size = getBuildingSize(b.type);
            const cx = b.pos.x + Math.floor(size.w / 2);
            const cy = b.pos.y + Math.floor(size.h / 2);
            return { pos: { x: cx, y: cy }, key: `${cx},${cy}` } as CampfireAnchor;
        });
}

function nearestCampfire(campfires: CampfireAnchor[], origin: Vec2): CampfireAnchor | null {
    if (!campfires.length) return null;
    let best = campfires[0];
    let bestDist = distanceSq(origin, best.pos);
    for (let i = 1; i < campfires.length; i++) {
        const d = distanceSq(origin, campfires[i].pos);
        if (d < bestDist) {
            best = campfires[i];
            bestDist = d;
        }
    }
    return best;
}

function drawVillagers(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    villagerTextures: { male?: ImageBitmap | null; female?: ImageBitmap | null; default?: ImageBitmap | null } | null
) {
    const villagers = Object.values(st.villagers).filter((v) => v.state === "alive");
    if (!villagers.length) return;

    const campfires = getCampfires(st);
    const assignments = villagers.map(v => ({ v, camp: nearestCampfire(campfires, v.pos) }));

    const grouped: Record<string, { camp: CampfireAnchor | null; villagers: typeof assignments }> = {} as Record<
        string,
        { camp: CampfireAnchor | null; villagers: typeof assignments }
    >;

    for (const entry of assignments) {
        const key = entry.camp ? entry.camp.key : "__none__";
        if (!grouped[key]) grouped[key] = { camp: entry.camp, villagers: [] };
        grouped[key].villagers.push(entry);
    }

    const timeMs = st.nowMs;
    const orbitJoinRadius = 1.2;
    const orbitBaseRadius = 0.45;

    for (const group of Object.values(grouped)) {
        const { camp, villagers: groupVillagers } = group;
        const count = groupVillagers.length;

        groupVillagers.forEach((entry, idx) => {
            const v = entry.v;
            let gx = v.pos.x;
            let gy = v.pos.y;

            if (camp) {
                const dist = Math.sqrt(distanceSq(v.pos, camp.pos));

                if (dist <= orbitJoinRadius) {
                    const wobble = 0.05 * Math.sin(timeMs / 900 + idx * 0.7);
                    const radius = orbitBaseRadius + wobble;
                    const spin = timeMs / 6000;
                    const angle = (idx / count) * Math.PI * 2 + spin;

                    const targetX = camp.pos.x + Math.cos(angle) * radius;
                    const targetY = camp.pos.y + Math.sin(angle) * radius;
                    const t = clamp01((orbitJoinRadius - dist) / orbitJoinRadius);

                    gx = gx * (1 - t) + targetX * t;
                    gy = gy * (1 - t) + targetY * t;
                } else {
                    const idle = 0.04 * Math.sin(timeMs / 1100 + idx);
                    gy = gy + idle;
                }
            } else {
                const idle = 0.08 * Math.sin(timeMs / 1000 + idx);
                gy = gy + idle;
            }

            const { sx, sy } = tileToScreen(gx, gy, originX, originY, cosA, sinA);
            const cx = sx + HALF_W;
            const cy = sy + HALF_H * 0.6;

            let tex: ImageBitmap | null | undefined = null;
            if (villagerTextures) {
                if (v.gender === "female") tex = villagerTextures.female ?? villagerTextures.default ?? null;
                else tex = villagerTextures.male ?? villagerTextures.default ?? null;
            }

            if (tex) {
                drawIsoSprite(ctx, tex, sx, sy, {
                    heightScale: 0.6,
                    widthScale: 0.6,
                    offsetY: -1,
                    flipX: v.facing === "left"
                });
            } else {
                ctx.fillStyle = VILLAGER_COLOR;
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = "rgba(255,255,255,0.7)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            // Draw small name label above villager (smaller)
            if (v.name) {
                const name = String(v.name);
                ctx.font = "8px Space Grotesk, Segoe UI, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                const textX = cx;
                const textY = cy - 6;

                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                ctx.strokeText(name, textX, textY);

                ctx.fillStyle = "#ffffff";
                ctx.fillText(name, textX, textY);
            }
        });
    }
}

function drawGameAnimals(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    dogTexture: ImageBitmap | null
) {
    const animals = Object.values(st.animals || {}).filter(a => a.state !== "dead");
    if (!animals.length) return;

    for (const a of animals) {
        const { sx, sy } = tileToScreen(a.pos.x, a.pos.y, originX, originY, cosA, sinA);
        const cx = sx + HALF_W;
        const cy = sy + HALF_H * 0.6;

        if (a.type === "dog") {
            if (dogTexture) {
                drawIsoSprite(ctx, dogTexture, sx, sy, { heightScale: 0.6, widthScale: 0.6, offsetY: -1 });
            } else {
                ctx.fillStyle = "#8B5E3C";
                ctx.beginPath();
                ctx.ellipse(cx, cy, 3, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "rgba(0,0,0,0.35)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }
}

function drawOverlays(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    hover: Vec2 | null,
    buildMode: BuildingTypeId | null,
    canPlaceHover: boolean,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
    const buildingAt = (pos: Vec2) =>
        Object.values(st.buildings).find((b) => {
            const size = getBuildingSize(b.type);
            return pos.x >= b.pos.x && pos.x < b.pos.x + size.w && pos.y >= b.pos.y && pos.y < b.pos.y + size.h;
        });

    const drawTileHighlight = (pos: Vec2, stroke: string, fill: string) => {
        const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);

        ctx.beginPath();
        ctx.moveTo(sx, sy + HALF_H);
        ctx.lineTo(sx + HALF_W, sy);
        ctx.lineTo(sx + TILE_W, sy + HALF_H);
        ctx.lineTo(sx + HALF_W, sy + TILE_H);
        ctx.closePath();

        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    };

    if (st.selection?.kind === "tile") {
        drawTileHighlight(st.selection.pos, "rgba(255,255,255,0.35)", "rgba(255,255,255,0.08)");
    }

    if (!hover) return;

    const hoveredBuilding = buildingAt(hover);

    if (buildMode) {
        const s = canPlaceHover ? "rgba(34,197,94,0.75)" : "rgba(239,68,68,0.8)";
        const f = canPlaceHover ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";
        const size = getBuildingSize(buildMode);
        const topLeft = getFootprintTopLeft(hover, size);

        for (let dy = 0; dy < size.h; dy++) {
            for (let dx = 0; dx < size.w; dx++) {
                const pos = { x: topLeft.x + dx, y: topLeft.y + dy };
                drawTileHighlight(pos, s, f);

                const ghost = BUILDING_COLORS[buildMode] || "#ffffff";
                const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);

                ctx.fillStyle = applyAlpha(ghost, 0.35);
                ctx.beginPath();
                ctx.moveTo(sx, sy + HALF_H);
                ctx.lineTo(sx + HALF_W, sy);
                ctx.lineTo(sx + TILE_W, sy + HALF_H);
                ctx.lineTo(sx + HALF_W, sy + TILE_H);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = applyAlpha("#000000", 0.25);
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        return;
    }

    if (hoveredBuilding) {
        const size = getBuildingSize(hoveredBuilding.type);
        for (let dy = 0; dy < size.h; dy++) {
            for (let dx = 0; dx < size.w; dx++) {
                drawTileHighlight(
                    { x: hoveredBuilding.pos.x + dx, y: hoveredBuilding.pos.y + dy },
                    "rgba(255,255,255,0.92)",
                    "rgba(255,255,255,0.18)"
                );
            }
        }
        return;
    }

    drawTileHighlight(hover, "rgba(255,255,255,0.35)", "rgba(255,255,255,0.08)");
}

function applyAlpha(hex: string, alpha: number) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
