"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import { getBuildingSize, getFootprintTopLeft } from "../../src/game/domains/buildings/model/buildingSizes";
import type { BuildingTypeId, GameState, Vec2, WorldTileId } from "../../src/game/types/GameState";

const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DEG2RAD = Math.PI / 180;

const TILE_COLORS: Record<WorldTileId, string> = {
    water: "#6cd4ff",
    sand: "#f4d57b",
    rock: "#a2a8b5",
    dirt: "#d7a46a",
    grass: "#9adf7f",
    forest: "#63a66b",
    meadow: "#b7f29a",
    desert: "#f1c06b",
    swamp: "#6fa384"
};

const BUILDING_COLORS: Partial<Record<BuildingTypeId, string>> = {
    gather_hut: "#3d8d4a",
    campfire: "#d97745",
    storage: "#5c6ac4",
    watchpost: "#c45c7b",
    townhall: "#3a5f8f",
    road: "#8d7355"
};

const VILLAGER_COLOR = "#1f2937";
const GRID_COLOR = "rgba(255,255,255,0.12)";

type Camera = { x: number; y: number; z: number };
type DragState = { active: boolean; startX: number; startY: number; camX: number; camY: number };

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

    const minZoomForViewport = useCallback(
        (vw: number, vh: number) => Math.max(vw / worldPx.w, vh / worldPx.h) * 1.05,
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

        const dpr = window.devicePixelRatio || 1;
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
        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));
        setCam((prev) => {
            const centered = { x: (worldPx.w - vw / prev.z) / 2, y: (worldPx.h - vh / prev.z) / 2, z: prev.z };
            return clampCam(centered, vw, vh);
        });
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

        const dpr = window.devicePixelRatio || 1;
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
        const margin = 2;
        const minX = Math.max(0, Math.floor(Math.min(...gridCorners.map((g) => g.gx))) - margin);
        const maxX = Math.min(st.world.width - 1, Math.ceil(Math.max(...gridCorners.map((g) => g.gx))) + margin);
        const minY = Math.max(0, Math.floor(Math.min(...gridCorners.map((g) => g.gy))) - margin);
        const maxY = Math.min(st.world.height - 1, Math.ceil(Math.max(...gridCorners.map((g) => g.gy))) + margin);

        ctx.save();
        ctx.translate(-cam.x * cam.z, -cam.y * cam.z);
        ctx.scale(cam.z, cam.z);

        drawTiles(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, minX, maxX, minY, maxY);
        drawGrid(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA, minX, maxX, minY, maxY);
        drawBuildings(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);
        drawVillagers(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        drawOverlays(ctx, st, hoverTile, buildMode, canPlaceHover, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        ctx.restore();
    }, [st, hoverTile, buildMode, canPlaceHover, cam, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA]);

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

        const tx = Math.floor(gx);
        const ty = Math.floor(gy);

        if (tx < 0 || ty < 0 || tx >= st.world.width || ty >= st.world.height) return null;
        return { x: tx, y: ty };
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
        </div>
    );
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
    maxY: number
) {
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const tile = st.world.tiles[y * st.world.width + x];
            if (!tile) continue;
            const { sx, sy } = tileToScreen(x, y, originX, originY, cosA, sinA);
            const base = TILE_COLORS[tile.id] || "#7ea";
            drawTileDiamond(ctx, sx, sy, base, "rgba(0,0,0,0.2)", "rgba(0,0,0,0.12)");
        }
    }
}

function drawGrid(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.8;

    for (let y = minY; y <= maxY + 1; y++) {
        const { sx: sx0, sy: sy0 } = tileToScreen(minX, y, originX, originY, cosA, sinA);
        const { sx: sx1, sy: sy1 } = tileToScreen(maxX + 1, y, originX, originY, cosA, sinA);
        ctx.beginPath();
        ctx.moveTo(sx0, sy0 + HALF_H);
        ctx.lineTo(sx1, sy1 + HALF_H);
        ctx.stroke();
    }

    for (let x = minX; x <= maxX + 1; x++) {
        const { sx: sx0, sy: sy0 } = tileToScreen(x, minY, originX, originY, cosA, sinA);
        const { sx: sx1, sy: sy1 } = tileToScreen(x, maxY + 1, originX, originY, cosA, sinA);
        ctx.beginPath();
        ctx.moveTo(sx0 + HALF_W, sy0);
        ctx.lineTo(sx1 + HALF_W, sy1 + TILE_H);
        ctx.stroke();
    }
}

function drawBuildings(ctx: CanvasRenderingContext2D, st: GameState, originX: number, originY: number, cosA: number, sinA: number) {
    const entries = Object.values(st.buildings);
    if (!entries.length) return;

    const roadSet = new Set(entries.filter((b) => b.type === "road").map((b) => `${b.pos.x},${b.pos.y}`));

    for (const b of entries) {
        if (b.type === "road") {
            drawRoadTile(ctx, b.pos, roadSet, originX, originY, cosA, sinA);
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


function drawVillagers(ctx: CanvasRenderingContext2D, st: GameState, originX: number, originY: number, cosA: number, sinA: number) {
    const villagers = Object.values(st.villagers).filter((v) => v.state === "alive");
    if (!villagers.length) return;

    for (const v of villagers) {
        const { sx, sy } = tileToScreen(v.pos.x, v.pos.y, originX, originY, cosA, sinA);
        const cx = sx + HALF_W;
        const cy = sy + HALF_H * 0.6;

        ctx.fillStyle = VILLAGER_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
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
