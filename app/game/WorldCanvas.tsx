"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import type { BuildingTypeId, GameState, Vec2, WorldTileId } from "../../src/game/types/GameState";

// Isometric rhombus dimensions (flat top). Width should be roughly 2x height for a classic 2.5D look.
const TILE_W = 64;
const TILE_H = 32;
const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DEG2RAD = Math.PI / 180;
const PAD = 0; // no artificial padding

const TILE_COLORS: Record<WorldTileId, string> = {
    water: "#65a8d6",
    sand: "#d9c07b",
    rock: "#8e9198",
    dirt: "#b78a61",
    grass: "#7fb46a",
    forest: "#4f7a48"
};

const BUILDING_COLORS: Partial<Record<BuildingTypeId, string>> = {
    gather_hut: "#3d8d4a",
    campfire: "#d97745",
    storage: "#5c6ac4",
    watchpost: "#c45c7b",
    townhall: "#3a5f8f"
};

const GRID_COLOR = "rgba(0,0,0,0.08)";

type Camera = {
    x: number;
    y: number;
    z: number;
};

type DragState = {
    active: boolean;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
};

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

    const canPlaceHover = !!(buildMode && hoverTile && canPlaceAt(st, hoverTile));

    const minZoomForViewport = (vw: number, vh: number) => {
        const fit = Math.max(vw / worldPx.w, vh / worldPx.h);
        return Math.max(0.5, fit); // allow further zoom out but keep minimum reasonable
    };

    const clampCam = (next: Camera, vw: number, vh: number) => {
        const minZ = minZoomForViewport(vw, vh);
        const z = Math.max(minZ, Math.min(2.5, next.z));
        const maxX = Math.max(0, worldPx.w - vw / z);
        const maxY = Math.max(0, worldPx.h - vh / z);
        const x = Math.max(0, Math.min(maxX, next.x));
        const y = Math.max(0, Math.min(maxY, next.y));
        return { x, y, z };
    };

    const resize = () => {
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
    };

    useEffect(() => {
        resize();
        const wrap = wrapRef.current;
        if (!wrap) return;

        const ro = new ResizeObserver(() => resize());
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [worldPx.w, worldPx.h]);

    useEffect(() => {
        resize();
    }, [st.world.width, st.world.height]);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const r = wrap.getBoundingClientRect();
        const vw = Math.max(1, Math.floor(r.width));
        const vh = Math.max(1, Math.floor(r.height));
        setCam((prev) => {
            const centered = {
                x: (worldPx.w - vw / prev.z) / 2,
                y: (worldPx.h - vh / prev.z) / 2,
                z: prev.z
            };
            return clampCam(centered, vw, vh);
        });
    }, [worldPx.w, worldPx.h]);

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

        ctx.save();
        ctx.translate(-cam.x * cam.z, -cam.y * cam.z);
        ctx.scale(cam.z, cam.z);

        drawTiles(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);
        drawGrid(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);
        drawBuildings(ctx, st, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA);

        drawOverlays(
            ctx,
            st,
            hoverTile,
            buildMode,
            canPlaceHover,
            worldPx.originX,
            worldPx.originY,
            worldPx.cosA,
            worldPx.sinA
        );

        ctx.restore();
    }, [st, hoverTile, buildMode, canPlaceHover, cam, worldPx.originX, worldPx.originY, worldPx.cosA, worldPx.sinA]);

    const screenToWorld = (clientX: number, clientY: number) => {
        const wrap = wrapRef.current;
        if (!wrap) return null;
        const r = wrap.getBoundingClientRect();
        const sx = clientX - r.left;
        const sy = clientY - r.top;
        const wx = cam.x + sx / cam.z;
        const wy = cam.y + sy / cam.z;
        return { wx, wy };
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
        if (ev.button === 2 || (ev.button === 0 && ev.getModifierState("Space"))) {
            ev.preventDefault();
            startPan(ev.clientX, ev.clientY);
            return;
        }

        if (ev.button === 0) {
            const tile = getTileFromClient(ev.clientX, ev.clientY);
            if (!tile) return;

            if (buildMode && !canPlaceAt(st, tile)) return;
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

function tileToScreen(x: number, y: number, originX: number, originY: number, cosA: number, sinA: number) {
    const ix = x - y;
    const iy = x + y;
    const rx = ix * cosA - iy * sinA;
    const ry = ix * sinA + iy * cosA;
    const sx = rx * HALF_W + originX;
    const sy = ry * HALF_H + originY;
    return { sx, sy };
}

function drawTileDiamond(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    fill: string,
    stroke: string,
    shadow: string
) {
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

    // subtle bottom shadow for depth
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
    sinA: number
) {
    for (let y = 0; y < st.world.height; y++) {
        for (let x = 0; x < st.world.width; x++) {
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
    sinA: number
) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.8;

    for (let y = 0; y <= st.world.height; y++) {
        const { sx: sx0, sy: sy0 } = tileToScreen(0, y, originX, originY, cosA, sinA);
        const { sx: sx1, sy: sy1 } = tileToScreen(st.world.width, y, originX, originY, cosA, sinA);
        ctx.beginPath();
        ctx.moveTo(sx0, sy0 + HALF_H);
        ctx.lineTo(sx1, sy1 + HALF_H);
        ctx.stroke();
    }

    for (let x = 0; x <= st.world.width; x++) {
        const { sx: sx0, sy: sy0 } = tileToScreen(x, 0, originX, originY, cosA, sinA);
        const { sx: sx1, sy: sy1 } = tileToScreen(x, st.world.height, originX, originY, cosA, sinA);
        ctx.beginPath();
        ctx.moveTo(sx0 + HALF_W, sy0);
        ctx.lineTo(sx1 + HALF_W, sy1 + TILE_H);
        ctx.stroke();
    }
}

function drawBuildings(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    originX: number,
    originY: number,
    cosA: number,
    sinA: number
) {
    const entries = Object.values(st.buildings);
    if (!entries.length) return;

    for (const b of entries) {
        const color = BUILDING_COLORS[b.type] || "#2e2e2e";
        const { sx, sy } = tileToScreen(b.pos.x, b.pos.y, originX, originY, cosA, sinA);

        ctx.fillStyle = applyAlpha(color, 0.9);
        ctx.beginPath();
        ctx.moveTo(sx + HALF_W, sy - TILE_H * 0.2);
        ctx.lineTo(sx + TILE_W, sy + HALF_H);
        ctx.lineTo(sx + HALF_W, sy + TILE_H * 1.1);
        ctx.lineTo(sx, sy + HALF_H);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(0,0,0,0.35)";
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

    if (hover) {
        if (buildMode) {
            const s = canPlaceHover ? "rgba(34,197,94,0.75)" : "rgba(239,68,68,0.8)";
            const f = canPlaceHover ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";
            drawTileHighlight(hover, s, f);

            const ghost = BUILDING_COLORS[buildMode] || "#ffffff";
            const { sx, sy } = tileToScreen(hover.x, hover.y, originX, originY, cosA, sinA);

            ctx.fillStyle = applyAlpha(ghost, 0.35);
            ctx.beginPath();
            ctx.moveTo(sx + HALF_W, sy + TILE_H * 0.15);
            ctx.lineTo(sx + TILE_W * 0.9, sy + HALF_H);
            ctx.lineTo(sx + HALF_W, sy + TILE_H * 0.85);
            ctx.lineTo(sx + TILE_W * 0.1, sy + HALF_H);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = applyAlpha("#000000", 0.25);
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            drawTileHighlight(hover, "rgba(255,255,255,0.35)", "rgba(255,255,255,0.08)");
        }
    }
}

function applyAlpha(hex: string, alpha: number) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}
