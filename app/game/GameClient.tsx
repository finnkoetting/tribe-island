"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";
import * as engine from "../../src/game/engine";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import type { BuildingTypeId, GameState, Vec2 } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";

const BUILDABLES: BuildingTypeId[] = ["gather_hut", "campfire", "storage", "watchpost", "townhall"];
const BUILD_META: Record<BuildingTypeId, { title: string; cost: string }> = {
    townhall: { title: "Rathaus", cost: "Start" },
    gather_hut: { title: "Sammelhuette", cost: "20 Holz" },
    campfire: { title: "Lagerfeuer", cost: "10 Holz" },
    storage: { title: "Lagerhaus", cost: "25 Holz, 10 Stein" },
    watchpost: { title: "Wachtposten", cost: "18 Holz, 6 Stein" }
};

const RES_ORDER: Array<{ id: keyof GameState["inventory"]; label: string; Icon: FC; color: string }> = [
    { id: "wood", label: "Holz", Icon: WoodIcon, color: "#d4a373" },
    { id: "berries", label: "Beeren", Icon: BerriesIcon, color: "#b85acb" },
    { id: "fish", label: "Fisch", Icon: FishIcon, color: "#4cc3ff" },
    { id: "stone", label: "Stein", Icon: StoneIcon, color: "#9ca3af" },
    { id: "fibers", label: "Fasern", Icon: FibersIcon, color: "#6ee7b7" },
    { id: "medicine", label: "Medizin", Icon: MedicineIcon, color: "#f472b6" },
    { id: "knowledge", label: "Wissen", Icon: KnowledgeIcon, color: "#fbbf24" },
    { id: "gold", label: "Gold", Icon: GoldIcon, color: "#f59e0b" }
];

export default function GameClient() {
    const [st, setSt] = useState<GameState>(() => engine.create.createGame());
    const lastRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>("gather_hut");
    const [hoverTile, setHoverTile] = useState<Vec2 | null>(null);

    useEffect(() => {
        const loop = (t: number) => {
            if (lastRef.current === null) lastRef.current = t;
            const dt = Math.min(250, Math.max(0, t - lastRef.current));
            lastRef.current = t;

            setSt(prev => engine.tick.tick(prev, dt));
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const aliveVillagers = useMemo(() => Object.values(st.villagers).filter(v => v.state === "alive"), [st.villagers]);
    const hoveredBuilding = useMemo(() => {
        if (!hoverTile) return null;
        return Object.values(st.buildings).find(b => b.pos.x === hoverTile.x && b.pos.y === hoverTile.y) || null;
    }, [hoverTile, st.buildings]);
    const hoveredTileId = useMemo(() => {
        if (!hoverTile) return "";
        const i = hoverTile.y * st.world.width + hoverTile.x;
        return st.world.tiles[i]?.id ?? "";
    }, [hoverTile, st.world]);
    const canPlaceHover = useMemo(() => (hoverTile ? canPlaceAt(st, hoverTile) : false), [hoverTile, st]);

    const handleTileClick = (pos: Vec2) => {
        setSt(prev => {
            let next: GameState = { ...prev, selection: { kind: "tile", pos } };
            if (buildMode) {
                next = engine.commands.placeBuilding(next, buildMode, pos);
            }
            return next;
        });
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                overflow: "hidden",
                background: "radial-gradient(circle at 20% 20%, #1f2a38 0%, #111827 45%, #0b1220 100%)",
                color: "#e5e7eb",
                fontFamily: "Nunito, system-ui, sans-serif"
            }}
        >
            <div style={{ position: "absolute", inset: 0 }}>
                <WorldCanvas
                    st={st}
                    buildMode={buildMode}
                    onTileClick={handleTileClick}
                    onHover={setHoverTile}
                    onCancelBuild={() => setBuildMode(null)}
                />
            </div>

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <TopLeftHud st={st} />
                <TopRightResources st={st} />
                <HoverCard hoveredBuilding={hoveredBuilding} hoveredTileId={hoveredTileId} hoverTile={hoverTile} canPlace={canPlaceHover} buildMode={buildMode} />
                <BottomHud st={st} setSt={setSt} buildMode={buildMode} setBuildMode={setBuildMode} villagerCount={aliveVillagers.length} />
            </div>
        </div>
    );
}

function TopLeftHud({ st }: { st: GameState }) {
    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                left: 18,
                padding: "10px 14px",
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
                pointerEvents: "auto"
            }}
        >
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.2 }}>Tribe Island</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <Tag label="Phase" value={st.time.phase} />
                <Tag label="Zeit" value={formatClock(st)} />
                <Tag label="Tag" value={String(st.time.day)} />
            </div>
        </div>
    );
}

function TopRightResources({ st }: { st: GameState }) {
    return (
        <div
            style={{
                position: "absolute",
                top: 18,
                right: 18,
                display: "grid",
                gap: 6,
                pointerEvents: "auto"
            }}
        >
            {RES_ORDER.map(res => (
                <div
                    key={res.id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        minWidth: 120,
                        padding: "6px 10px",
                        background: "rgba(0,0,0,0.55)",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.35)"
                    }}
                >
                    <span
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `linear-gradient(145deg, ${res.color}33, ${res.color}22)`,
                            border: `1px solid ${res.color}55`,
                            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12)",
                            fontSize: 15
                        }}
                    >
                        <res.Icon />
                    </span>
                    <span style={{ flex: 1, opacity: 0.85 }}>{res.label}</span>
                    <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{st.inventory[res.id] ?? 0}</span>
                </div>
            ))}
        </div>
    );
}

function HoverCard({ hoveredBuilding, hoveredTileId, hoverTile, canPlace, buildMode }: { hoveredBuilding: GameState["buildings"][string] | null; hoveredTileId: string; hoverTile: Vec2 | null; canPlace: boolean; buildMode: BuildingTypeId | null }) {
    if (!hoverTile) return null;
    return (
        <div
            style={{
                position: "absolute",
                top: 90,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
                display: "flex",
                gap: 10,
                pointerEvents: "none",
                fontSize: 13
            }}
        >
            <span>Tile {hoverTile.x},{hoverTile.y} ({hoveredTileId || "-"})</span>
            {buildMode && <span>| Modus: {BUILD_META[buildMode]?.title ?? buildMode}</span>}
            {buildMode && <span>| {canPlace ? "frei" : "blockiert"}</span>}
            {hoveredBuilding && <span>| {BUILD_META[hoveredBuilding.type]?.title ?? hoveredBuilding.type}</span>}
        </div>
    );
}

function BottomHud({ st, setSt, buildMode, setBuildMode, villagerCount }: { st: GameState; setSt: React.Dispatch<React.SetStateAction<GameState>>; buildMode: BuildingTypeId | null; setBuildMode: (m: BuildingTypeId | null) => void; villagerCount: number }) {
    const hunger = st.alerts?.hunger?.severity ?? 0;
    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pointerEvents: "none",
                gap: 12,
                background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 55%)"
            }}
        >
            <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
                <SpeedButton label="||" active={st.speed === 0} onClick={() => setSt(s => ({ ...s, speed: 0 }))} />
                <SpeedButton label=">" active={st.speed === 1} onClick={() => setSt(s => ({ ...s, speed: 1 }))} />
                <SpeedButton label=">>" active={st.speed === 2} onClick={() => setSt(s => ({ ...s, speed: 2 }))} />
            </div>

            <div style={{ display: "grid", gap: 8, pointerEvents: "auto" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    {BUILDABLES.map(type => (
                        <BuildButton key={type} active={buildMode === type} label={BUILD_META[type]?.title ?? type} onClick={() => setBuildMode(prev => (prev === type ? null : type))} />
                    ))}
                    <BuildButton active={!buildMode} label="Abbrechen" onClick={() => setBuildMode(null)} />
                </div>
                <div style={{ textAlign: "center", fontSize: 12, opacity: 0.85 }}>
                    {buildMode ? `Bauen: ${BUILD_META[buildMode]?.title ?? buildMode} (${BUILD_META[buildMode]?.cost ?? ""})` : "Kein Bau aktiv"}
                </div>
            </div>

            <div style={{ display: "grid", gap: 6, pointerEvents: "auto", justifyItems: "end" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label="Bewohner" value={String(villagerCount)} />
                    <Tag label="Hunger" value={String(hunger)} tone={hunger > 0 ? "warn" : "muted"} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label="Zeit" value={formatClock(st)} />
                    <Tag label="Tag" value={String(st.time.day)} />
                </div>
            </div>
        </div>
    );
}

function SpeedButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: active ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.14)",
                background: active ? "rgba(34,211,238,0.18)" : "rgba(0,0,0,0.5)",
                color: "#e5e7eb",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: active ? "0 10px 20px rgba(34,211,238,0.25)" : "0 8px 16px rgba(0,0,0,0.35)"
            }}
        >
            {label}
        </button>
    );
}

function BuildButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: active ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.12)",
                background: active ? "rgba(34,211,238,0.14)" : "rgba(0,0,0,0.55)",
                color: "#e5e7eb",
                cursor: "pointer",
                minWidth: 110,
                boxShadow: "0 10px 18px rgba(0,0,0,0.35)",
                fontWeight: 700
            }}
        >
            {label}
        </button>
    );
}

function Tag({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "warn" }) {
    const palette = tone === "warn" ? { bg: "rgba(248,113,113,0.2)", border: "rgba(248,113,113,0.35)" } : { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.16)" };
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                fontSize: 12,
                fontWeight: 700,
                color: "#e5e7eb"
            }}
        >
            <span style={{ opacity: 0.75 }}>{label}</span>
            <span>{value}</span>
        </span>
    );
}

function WoodIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="6" width="14" height="8" rx="2" fill="#b0753b" stroke="#8c5a2e" strokeWidth="1.2" />
            <path d="M6 8.5h5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
            <path d="M7 11h3.5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
            <circle cx="13.5" cy="10" r="0.9" fill="#d9b28c" />
        </svg>
    );
}

function BerriesIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="8" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <circle cx="12" cy="11" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <circle cx="7" cy="12" r="2.4" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
            <path d="M10 7l3-3" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}

function FishIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M5 10c2.2-3 5.8-3.8 9-2.2l2-1.3v7L14 12.2C10.8 13.8 7.2 13 5 10Z"
                fill="#67e8f9"
                stroke="#0ea5e9"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
            <circle cx="12.5" cy="9.5" r="0.7" fill="#0f172a" />
        </svg>
    );
}

function StoneIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M5.5 6.5 11 4.5l3.8 2.5.7 5.2-2.7 2.5H7.2L4.5 12l1-4.6Z"
                fill="#d1d5db"
                stroke="#6b7280"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FibersIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7 15c0-5 1.5-7 3-10" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M10 15c0-5 1.2-7.5 2.8-10.5" stroke="#34d399" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M12.5 15c0-4.5-.5-7 1-10" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function MedicineIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.5" y="4.5" width="11" height="11" rx="2.5" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
            <path d="M10 7v6M7 10h6" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    );
}

function KnowledgeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M6 6h7c1.1 0 2 .9 2 2v7l-2-.8-2 .8-2-.8-2 .8V8c0-1.1.9-2 2-2Z"
                fill="#fcd34d"
                stroke="#b45309"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
            <path d="M8 8h5" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
            <path d="M8 10h3" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}

function GoldIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="6" fill="#fbbf24" stroke="#c27803" strokeWidth="1.2" />
            <path d="M8 10.5c1.5.8 2.8.8 4 0M8 8.5c1.5-.8 2.8-.8 4 0" stroke="#92400e" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
    );
}

function formatClock(st: GameState) {
    const phaseMs = st.time.msPerDay / 4;
    const dayMs = st.time.phaseIndex * phaseMs + st.time.phaseElapsedMs;
    const t = Math.max(0, Math.min(st.time.msPerDay, dayMs));
    const minutesTotal = Math.floor((t / st.time.msPerDay) * 24 * 60);
    const hh = String(Math.floor(minutesTotal / 60)).padStart(2, "0");
    const mm = String(minutesTotal % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}
