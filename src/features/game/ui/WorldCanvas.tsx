"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ws from "@/styles/world.module.scss";
import type { GameState, Cell, BuildingKey } from "../types";
import { BUILDINGS } from "../engine";
import { TILE, PAD, PICK_THRESHOLD } from "../engine/constants";

type FilledCell = Exclude<Cell, null>;

type CtxRR = CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
};

const iso = (x: number, y: number, w: number) => {
    const ox = PAD + (w * TILE) / 2;
    const oy = PAD + 80;
    return { x: (x - y) * (TILE / 2) + ox, y: (x + y) * (TILE / 4) + oy };
};

const pick = (mx: number, my: number, st: GameState) => {
    let best: null | { x: number; y: number; d: number } = null;

    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
        const p = iso(x, y, st.w);
        const dx = mx - p.x, dy = my - p.y;
        const d = dx * dx + dy * dy;
        if (!best || d < best.d) best = { x, y, d };
    }

    return best && best.d < (TILE * TILE * PICK_THRESHOLD) ? { x: best.x, y: best.y } : null;
};

const rr = (ctx: CtxRR, x: number, y: number, w: number, h: number, r: number) => {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
};

export default function WorldCanvas({
    st,
    onPlace,
    onCancel
}: {
    st: GameState;
    onPlace: (x: number, y: number) => void;
    onCancel: () => void;
}) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

    const dpr = useMemo(() => (typeof window === "undefined" ? 1 : Math.max(1, window.devicePixelRatio || 1)), []);

    const render = useCallback(() => {
        const c = ref.current;
        if (!c) return;

        const r = c.getBoundingClientRect();
        c.width = Math.floor(r.width * dpr);
        c.height = Math.floor(r.height * dpr);

        const ctx = c.getContext("2d") as CtxRR | null;
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const w = r.width, h = r.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.52, cy = h * 0.58;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.42, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,211,238,.06)";
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.36, h * 0.23, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,.08)";
        ctx.fill();

        for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
            const p = iso(x, y, st.w);
            const hw = TILE / 2, hh = TILE / 4;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + hw, p.y + hh);
            ctx.lineTo(p.x, p.y + hh * 2);
            ctx.lineTo(p.x - hw, p.y + hh);
            ctx.closePath();

            const isH = hover && hover.x === x && hover.y === y;
            ctx.fillStyle = isH ? "rgba(34,211,238,.22)" : "rgba(34,197,94,.22)";
            ctx.fill();
            ctx.strokeStyle = isH ? "rgba(34,211,238,.55)" : "rgba(255,255,255,.08)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        const list: { x: number; y: number; c: FilledCell; z: number }[] = [];
        for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
            const cell = st.grid[y][x];
            if (cell) list.push({ x, y, c: cell as FilledCell, z: x + y });
        }
        list.sort((a, b) => a.z - b.z);

        for (const it of list) {
            const p = iso(it.x, it.y, st.w);
            const d = BUILDINGS[it.c.type as BuildingKey];

            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 28, 22, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = it.c.done ? "rgba(0,0,0,.28)" : "rgba(0,0,0,.20)";
            ctx.fill();

            ctx.font = `700 28px ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = it.c.done ? "rgba(238,246,255,.95)" : "rgba(238,246,255,.55)";
            ctx.fillText(d.icon, p.x, p.y + 10);

            if (!it.c.done) {
                const bw = 52, bh = 10, x0 = p.x - bw / 2, y0 = p.y + 36;

                rr(ctx, x0, y0, bw, bh, 999);
                ctx.fillStyle = "rgba(255,255,255,.08)";
                ctx.fill();

                const prog = 1 - (it.c.remain / d.time);
                rr(ctx, x0, y0, bw * prog, bh, 999);
                ctx.fillStyle = "rgba(251,191,36,.88)";
                ctx.fill();

                ctx.strokeStyle = "rgba(255,255,255,.12)";
                ctx.stroke();
            }
        }
    }, [st, hover, dpr]);

    useEffect(() => {
        render();
    }, [render]);

    useEffect(() => {
        const onResize = () => render();
        window.addEventListener("resize", onResize);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKey);
        };
    }, [onCancel, render]);

    return (
        <div className={ws.world}>
            <div className={ws.hint}>
                <div className={ws.tag}>{st.w}×{st.h}</div>
                <div className={ws.txt}>Bauen: unten wählen → Feld klicken · ESC/Rightclick = Abbrechen</div>
            </div>

            <canvas
                ref={ref}
                onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover(pick(e.clientX - r.left, e.clientY - r.top, st));
                }}
                onMouseLeave={() => setHover(null)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onCancel();
                }}
                onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const t = pick(e.clientX - r.left, e.clientY - r.top, st);
                    if (!t) return;
                    onPlace(t.x, t.y);
                }}
            />
        </div>
    );
}
