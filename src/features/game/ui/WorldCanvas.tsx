"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ws from "@/styles/world.module.scss";
import type { GameState, Cell } from "../types";
import { BUILDINGS, TICK_MS } from "../engine";
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const drawBar = (ctx: CtxRR, x: number, y: number, w: number, h: number, pct: number, time: number) => {
    rr(ctx, x, y, w, h, 999);
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.stroke();

    const fillW = Math.max(0, w * clamp01(pct));
    rr(ctx, x, y, fillW, h, 999);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "rgba(52, 211, 153, 0.95)");
    grad.addColorStop(0.5, "rgba(59, 130, 246, 0.95)");
    grad.addColorStop(1, "rgba(129, 140, 248, 0.95)");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (fillW > 6) {
        const shineW = Math.max(14, w * 0.18);
        const offset = (time / 900) % 1;
        const shineX = x + (w + shineW) * offset - shineW;
        ctx.save();
        rr(ctx, x, y, fillW, h, 999);
        ctx.clip();
        const shine = ctx.createLinearGradient(shineX, y, shineX + shineW, y);
        shine.addColorStop(0, "rgba(255,255,255,0)");
        shine.addColorStop(0.5, "rgba(255,255,255,0.55)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(x, y, fillW, h);
        ctx.restore();
    }
};

const drawBadge = (ctx: CtxRR, x: number, y: number, text: string) => {
    ctx.font = `800 12px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const padX = 10;
    const w = Math.max(28, ctx.measureText(text).width + padX * 2);
    const h = 22;
    const x0 = x - w / 2;
    const y0 = y - h / 2;

    rr(ctx, x0, y0, w, h, 999);
    ctx.fillStyle = "rgba(2,6,23,.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,.22)";
    ctx.stroke();

    ctx.fillStyle = "rgba(238,246,255,.92)";
    ctx.fillText(text, x, y + 1);
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
    const stateRef = useRef(st);
    const prevStateRef = useRef<GameState | null>(null);
    const tickAtRef = useRef<number>(typeof performance === "undefined" ? 0 : performance.now());
    const hoverRef = useRef<{ x: number; y: number } | null>(null);

    const dpr = useMemo(
        () => (typeof window === "undefined" ? 1 : Math.max(1, window.devicePixelRatio || 1)),
        []
    );

    useEffect(() => {
        hoverRef.current = hover;
    }, [hover]);

    useEffect(() => {
        prevStateRef.current = stateRef.current;
        stateRef.current = st;
        tickAtRef.current = typeof performance === "undefined" ? Date.now() : performance.now();
    }, [st]);

    const render = useCallback((time: number) => {
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
        const now = typeof time === "number" ? time : (typeof performance === "undefined" ? Date.now() : performance.now());
        const curr = stateRef.current;
        const prev = prevStateRef.current ?? curr;
        const alpha = clamp01((now - tickAtRef.current) / TICK_MS);

        // Background island glow
        const cx = w * 0.52, cy = h * 0.58;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.42, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(94, 234, 212, 0.18)";
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.36, h * 0.23, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251, 191, 36, 0.16)";
        ctx.fill();

        // Tiles
        const hoverCell = hoverRef.current;
        for (let y = 0; y < curr.h; y++) for (let x = 0; x < curr.w; x++) {
            const p = iso(x, y, curr.w);
            const hw = TILE / 2, hh = TILE / 4;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + hw, p.y + hh);
            ctx.lineTo(p.x, p.y + hh * 2);
            ctx.lineTo(p.x - hw, p.y + hh);
            ctx.closePath();

            const isH = hoverCell && hoverCell.x === x && hoverCell.y === y;

            ctx.fillStyle = isH ? "rgba(59,130,246,.22)" : "rgba(34,197,94,.28)";
            ctx.fill();

            ctx.strokeStyle = isH ? "rgba(59,130,246,.6)" : "rgba(255,255,255,.12)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Buildings sorted by depth
        const list: { x: number; y: number; c: FilledCell; z: number }[] = [];
        for (let y = 0; y < curr.h; y++) for (let x = 0; x < curr.w; x++) {
            const cell = curr.grid[y][x];
            if (cell) list.push({ x, y, c: cell as FilledCell, z: x + y });
        }
        list.sort((a, b) => a.z - b.z);

        for (const it of list) {
            const p = iso(it.x, it.y, curr.w);
            const def = BUILDINGS[it.c.type];
            const prevCell = prev.grid[it.y]?.[it.x] || null;

            // Shadow blob
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 28, 22, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = it.c.done ? "rgba(0,0,0,.28)" : "rgba(0,0,0,.20)";
            ctx.fill();

            // Icon
            ctx.font = `800 28px ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = it.c.done ? "rgba(238,246,255,.95)" : "rgba(238,246,255,.55)";
            ctx.fillText(def.icon, p.x, p.y + 10);

            // Build progress
            if (!it.c.done) {
                const bw = 56, bh = 10;
                const x0 = p.x - bw / 2;
                const y0 = p.y + 40;

                const prevRemain = prevCell && !prevCell.done ? prevCell.remain : it.c.remain + 1;
                const remain = lerp(prevRemain, it.c.remain, alpha);
                const pct = def.time > 0 ? 1 - (remain / def.time) : 1;
                drawBar(ctx, x0, y0, bw, bh, pct, now);
                continue;
            }

            // Job progress / Ready badge
            const j = it.c.job;
            if (j?.state === "working") {
                const bw = 62, bh = 10;
                const x0 = p.x - bw / 2;
                const y0 = p.y + 40;

                const prevRemain = prevCell?.job?.state === "working" ? prevCell.job.remain : j.remain + 1;
                const remain = lerp(prevRemain, j.remain, alpha);
                const pct = 1 - (remain / Math.max(1, j.total));
                drawBar(ctx, x0, y0, bw, bh, pct, now);
                drawBadge(ctx, p.x, y0 - 16, "⏳");
            } else if (j?.state === "ready") {
                drawBadge(ctx, p.x, p.y + 42, "✅ Collect");
            }
        }

        // Villagers (render last for readability)
        const prevVill = new Map(prev.villagers.map(v => [v.id, v]));
        const vill = [...curr.villagers].map(v => ({ v, z: v.pos.x + v.pos.y }));
        vill.sort((a, b) => a.z - b.z);

        for (const it of vill) {
            const v = it.v;
            const pv = prevVill.get(v.id);
            const posX = pv ? lerp(pv.pos.x, v.pos.x, alpha) : v.pos.x;
            const posY = pv ? lerp(pv.pos.y, v.pos.y, alpha) : v.pos.y;
            const seed = v.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const bob = Math.sin(now / 180 + seed) * (v.task.type === "idle" ? 0.8 : 1.6);

            // Map villager world-pos (grid units) to iso
            const px = posX - 0.5;
            const py = posY - 0.5;
            const p = iso(px, py, curr.w);

            // Shadow
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 30, 10, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,0,0,.26)";
            ctx.fill();

            // Body (simple)
            ctx.beginPath();
            ctx.arc(p.x, p.y + 18 + bob, 8.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,250,240,.95)";
            ctx.fill();

            // Head
            ctx.beginPath();
            ctx.arc(p.x, p.y + 8 + bob, 6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,243,224,.98)";
            ctx.fill();

            // Task indicator
            if (v.task.type !== "idle") {
                drawBadge(ctx, p.x, p.y - 10, "👷");
            }

            // Name (tiny)
            ctx.font = `700 10px ui-sans-serif, system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(203,213,225,.85)";
            ctx.fillText(v.name, p.x, p.y + 42 + bob);
        }
    }, [dpr]);

    useEffect(() => {
        let raf = 0;
        const loop = (time: number) => {
            render(time);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [render]);

    useEffect(() => {
        const onResize = () => render(typeof performance === "undefined" ? Date.now() : performance.now());
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
                <div className={ws.txt}>Bauen: unten wählen → Feld klicken · Ohne Auswahl: Gebäude klicken → Job/Collect</div>
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
