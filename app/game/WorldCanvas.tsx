"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import type { BuildingTypeId, GameState, Vec2, WorldTileId } from "../../src/game/types/GameState";

const TILE_SIZE = 16;

const TILE_COLORS: Record<WorldTileId, string> = {
    grass: "#7fb46a",
    dirt: "#b78a61",
    sand: "#d9c07b",
    water: "#65a8d6",
    rock: "#8e9198"
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

    const [drag, setDrag] = useState<{
        active: boolean;
        startX: number;
        startY: number;
        camX: number;
        camY: number;
    }>({ active: false, startX: 0, startY: 0, camX: 0, camY: 0 });

    const worldPx = useMemo(() => {
        const w = st.world.width * TILE_SIZE;
        const h = st.world.height * TILE_SIZE;
        return { w, h };
    }, [st.world.width, st.world.height]);

    const canPlaceHover = !!(buildMode && hoverTile && canPlaceAt(st, hoverTile));

    const clampCam = (next: Camera, vw: number, vh: number) => {
        const z = Math.max(0.6, Math.min(2.5, next.z));
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

        drawTiles(ctx, st);
        drawGrid(ctx, st);
        drawBuildings(ctx, st);

        drawOverlays(ctx, st, hoverTile, buildMode, canPlaceHover);

        ctx.restore();
    }, [st, hoverTile, buildMode, canPlaceHover, cam]);

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

        const tx = Math.floor(p.wx / TILE_SIZE);
        const ty = Math.floor(p.wy / TILE_SIZE);

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
        const isSpace = ev.nativeEvent instanceof MouseEvent && (ev.nativeEvent as any).shiftKey === false;

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
        const nextZ = Math.max(0.6, Math.min(2.5, cam.z * dir));

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
                width: "100%",
                height: "100%",
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
                    imageRendering: "pixelated"
                }}
            />
        </div>
    );
}

function drawTiles(ctx: CanvasRenderingContext2D, st: GameState) {
    const w = st.world.width;
    for (let y = 0; y < st.world.height; y++) {
        for (let x = 0; x < w; x++) {
            const tile = st.world.tiles[y * w + x];
            if (!tile) continue;
            ctx.fillStyle = TILE_COLORS[tile.id] || "#7ea";
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawGrid(ctx: CanvasRenderingContext2D, st: GameState) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const w = st.world.width;
    const h = st.world.height;

    for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE + 0.5, 0);
        ctx.lineTo(x * TILE_SIZE + 0.5, h * TILE_SIZE);
        ctx.stroke();
    }

    for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE + 0.5);
        ctx.lineTo(w * TILE_SIZE, y * TILE_SIZE + 0.5);
        ctx.stroke();
    }
}

function drawBuildings(ctx: CanvasRenderingContext2D, st: GameState) {
    const entries = Object.values(st.buildings);
    if (!entries.length) return;

    for (const b of entries) {
        const color = BUILDING_COLORS[b.type] || "#2e2e2e";
        const x = b.pos.x * TILE_SIZE;
        const y = b.pos.y * TILE_SIZE;

        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
    }
}

function drawOverlays(
    ctx: CanvasRenderingContext2D,
    st: GameState,
    hover: Vec2 | null,
    buildMode: BuildingTypeId | null,
    canPlaceHover: boolean
) {
    const drawTileHighlight = (pos: Vec2, stroke: string, fill: string) => {
        const x = pos.x * TILE_SIZE;
        const y = pos.y * TILE_SIZE;

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 0.75, TILE_SIZE - 1.5, TILE_SIZE - 1.5);
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
            const gx = hover.x * TILE_SIZE;
            const gy = hover.y * TILE_SIZE;

            ctx.fillStyle = applyAlpha(ghost, 0.35);
            ctx.fillRect(gx + 3, gy + 3, TILE_SIZE - 6, TILE_SIZE - 6);

            ctx.strokeStyle = applyAlpha("#000000", 0.25);
            ctx.strokeRect(gx + 2.5, gy + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
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
