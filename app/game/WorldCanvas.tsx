"use client";

import type React from "react";
import type { StaticImageData } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import { getBuildingSize, getFootprintTopLeft } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, Vec2, WorldTileId } from "../../src/game/types/GameState";
import battleTile0037 from "../../src/ui/game/textures/battle/tile_0037.png";
import townTile0000 from "../../src/ui/game/textures/town/tile_0000.png";
import townTile0001 from "../../src/ui/game/textures/town/tile_0001.png";
import townTile0002 from "../../src/ui/game/textures/town/tile_0002.png";
import townTile0025 from "../../src/ui/game/textures/town/tile_0025.png";
import treeTextureFile from "../../src/ui/game/textures/tree.png";
import townTile0109 from "../../src/ui/game/textures/town/tile_0109.png";

const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DEG2RAD = Math.PI / 180;
const MAX_DPR = 1.5;
const MIN_ZOOM = 1.2;
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
    water: [battleTile0037],
    sand: [townTile0025],
    rock: [townTile0109],
    mountain: [townTile0109],
    dirt: [townTile0025],
    grass: [townTile0000, townTile0001, townTile0002],
    forest: [townTile0000, townTile0001, townTile0002],
    meadow: [townTile0000, townTile0001, townTile0002],
    desert: [townTile0025]
};

const BUILDING_COLORS: Partial<Record<BuildingTypeId, string>> = {
    gather_hut: "#3d8d4a",
    campfire: "#d97745",
    storage: "#5c6ac4",
    watchpost: "#c45c7b",
    townhall: "#3a5f8f",
    road: "#8d7355",
    rock: "#7b6858",
    tree: "#3a6f3d"
};

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
};

export default function WorldCanvas({ st, buildMode, onTileClick, onHover, onCancelBuild }: WorldCanvasProps) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const spaceDownRef = useRef(false);

    const [hoverTile, setHoverTile] = useState<Vec2 | null>(null);
    const [cam, setCam] = useState<Camera>({ x: 0, y: 0, z: 1 });
    const [drag, setDrag] = useState<DragState>({ active: false, startX: 0, startY: 0, camX: 0, camY: 0 });
    const [showSettings, setShowSettings] = useState(false);
    const [showFps, setShowFps] = useState(false);
    const [fps, setFps] = useState(0);
    const [tileTextures, setTileTextures] = useState<TileTextureMap | null>(null);
    const [treeTexture, setTreeTexture] = useState<ImageBitmap | null>(null);
    const fpsFrames = useRef(0);
    const fpsLast = useRef(typeof performance !== "undefined" ? performance.now() : 0);

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
        loadImageBitmap(resolveImageSrc(treeTextureFile))
            .then((bmp) => {
                if (!cancelled) setTreeTexture(bmp);
            })
            .catch((err) => console.warn("Failed to load tree texture", err));
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
        const onToggleSettings = (e: KeyboardEvent) => {
            if (e.code === "KeyS") {
                e.preventDefault();
                setShowSettings((v) => !v);
            }
        };

        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));
        setCam((prev) => {
            const centered = { x: (worldPx.w - vw / prev.z) / 2, y: (worldPx.h - vh / prev.z) / 2, z: prev.z };
            return clampCam(centered, vw, vh);
        });

        window.addEventListener("keydown", onToggleSettings);
        return () => window.removeEventListener("keydown", onToggleSettings);
    }, [clampCam, worldPx.w, worldPx.h]);

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
        drawBuildings(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, treeTexture);
        if (showAnimals) drawAnimals(ctx, meadowAnimals, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);
        drawVillagers(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        drawOverlays(ctx, st, hoverTile, buildMode, canPlaceHover, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        ctx.restore();

        fpsFrames.current += 1;
        const now = typeof performance !== "undefined" ? performance.now() : 0;
        const elapsed = now - fpsLast.current;
        if (elapsed >= 400) {
            const nextFps = elapsed > 0 ? (fpsFrames.current * 1000) / elapsed : 0;
            fpsFrames.current = 0;
            fpsLast.current = now;
            setFps(nextFps);
        }
    }, [st, hoverTile, buildMode, canPlaceHover, cam, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, meadowAnimals, tileTextures, treeTexture]);

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
        if (ev.button === 2 || (ev.button === 0 && spaceDownRef.current)) {
            ev.preventDefault();
            startPan(ev.clientX, ev.clientY);
            return;
        }

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

        setCam(clampCam({ x: nextX, y: nextY, z: nextZ }, vw, vh));
    };

    const cursor = drag.active ? "grabbing" : buildMode ? (canPlaceHover ? "pointer" : "not-allowed") : "default";

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

            {showSettings && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        padding: "14px 16px",
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.78)",
                        color: "#f8fafc",
                        fontSize: 14,
                        minWidth: 240,
                        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        pointerEvents: "auto",
                        zIndex: 1000
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontWeight: 600 }}>Settings</span>
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#e2e8f0",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: 4
                            }}
                            aria-label="Close settings"
                        >
                            ×
                        </button>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={showFps}
                            onChange={(e) => setShowFps(e.target.checked)}
                            style={{ width: 16, height: 16 }}
                        />
                        <span>Show FPS</span>
                    </label>

                    <div style={{ marginTop: 10, color: "#cbd5e1", fontSize: 12 }}>Shortcut: S zum Öffnen/Schließen</div>
                </div>
            )}

            {showFps && (
                <div
                    style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(0,0,0,0.72)",
                        color: "#f8fafc",
                        fontSize: 13,
                        fontVariantNumeric: "tabular-nums",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.35)",
                        pointerEvents: "none",
                        zIndex: 1001
                    }}
                >
                    FPS: {fps.toFixed(1)}
                </div>
            )}
        </div>
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
    sinA: number
) {
    if (!animals.length) return;

    const timeMs = st.nowMs;

    for (const animal of animals) {
        const pos = animalPosition(animal, timeMs, st.world);
        const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
        const cx = sx + HALF_W;
        const cy = sy + HALF_H * 0.6;

        const style = ANIMAL_STYLES[animal.kind];
        const bodyR = animal.kind === "cow" ? 5 : 4;
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
    let t = seed ^ (a * 374761393) ^ (b * 668265263);
    t = (t ^ (t >> 13)) * 1274126177;
    t ^= t >> 16;
    return ((t >>> 0) % 4294967296) / 4294967295;
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
                ctx.drawImage(tex, dx, dy, TILE_W, TILE_H);
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
    treeTexture: ImageBitmap | null
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
            drawRockTile(ctx, b.pos, originX, originY, cosA, sinA);
            continue;
        }

        if (b.type === "tree") {
            drawTreeTile(ctx, b.pos, originX, originY, cosA, sinA, treeTexture);
            continue;
        }

        const size = getBuildingSize(b.type);
        const color = BUILDING_COLORS[b.type] || "#2e2e2e";

        for (let dy = 0; dy < size.h; dy++) {
            for (let dx = 0; dx < size.w; dx++) {
                const tx = b.pos.x + dx;
                const ty = b.pos.y + dy;
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

function drawRockTile(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
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
    treeTexture: ImageBitmap | null
) {
    const { sx, sy } = tileToScreen(pos.x, pos.y, originX, originY, cosA, sinA);
    if (treeTexture) {
        ctx.drawImage(treeTexture, sx, sy, TILE_W, TILE_H);
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

function drawVillagers(ctx: CanvasRenderingContext2D, st: GameState, originX: number, originY: number, cosA: number, sinA: number) {
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

            ctx.fillStyle = VILLAGER_COLOR;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 1;
            ctx.stroke();
        });
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
        drawTileHighlight(st.selection.pos, "rgba(11,107,255,0.8)", "rgba(11,107,255,0.12)");
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
                    "rgba(59,130,246,0.9)",
                    "rgba(59,130,246,0.14)"
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
