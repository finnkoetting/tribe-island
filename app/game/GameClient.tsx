"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as engine from "../../src/game/engine";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import type { Building, BuildingTypeId, GameState, Vec2, VillagerJobId } from "../../src/game/types/GameState";
import WorldCanvas from "./WorldCanvas";

const JOBS: VillagerJobId[] = ["idle", "gatherer", "builder", "researcher", "fisher", "guard"];
const BUILDABLES: BuildingTypeId[] = ["gather_hut", "campfire", "storage", "watchpost", "townhall"];

export default function GameClient() {
    const [st, setSt] = useState<GameState>(() => engine.create.createGame());
    const lastRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);

    const [px, setPx] = useState(32);
    const [py, setPy] = useState(32);
    const [buildMode, setBuildMode] = useState<BuildingTypeId | null>("gather_hut");
    const [hoverTile, setHoverTile] = useState<Vec2 | null>(null);

    useEffect(() => {
        const loop = (t: number) => {
            if (!lastRef.current) lastRef.current = t;
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
    const buildings = useMemo(() => Object.values(st.buildings), [st.buildings]);
    const hunger = st.alerts?.hunger?.severity ?? 0;
    const hoveredBuilding = useMemo(() => {
        if (!hoverTile) return null;
        return buildings.find(b => b.pos.x === hoverTile.x && b.pos.y === hoverTile.y) || null;
    }, [hoverTile, buildings]);

    const hoveredTileId = useMemo(() => {
        if (!hoverTile) return null;
        const i = hoverTile.y * st.world.width + hoverTile.x;
        return st.world.tiles[i]?.id ?? null;
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
                minHeight: "100vh",
                display: "grid",
                gridTemplateRows: "auto 1fr",
                background: "radial-gradient(circle at 20% 20%, #eef5ff, #dde7f5 45%, #d4dfef 70%)",
                color: "#0f172a",
                fontFamily: "'Inter', system-ui, sans-serif"
            }}
        >
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    gap: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(6px)",
                    background: "rgba(255,255,255,0.7)"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#22c55e)" }} />
                    <div>
                        <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>Tribe Island</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Tag {st.time.day} · {st.time.phase} · {formatClock(st)}</div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 0 }))} active={st.speed === 0}>
                        Pause
                    </Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 1 }))} active={st.speed === 1}>
                        Normal
                    </Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 2 }))} active={st.speed === 2}>
                        Fast
                    </Btn>
                    <Btn
                        onClick={() => {
                            lastRef.current = 0;
                            setSt(engine.create.createGame());
                            setPx(32);
                            setPy(32);
                        }}
                    >
                        New Run
                    </Btn>
                </div>
            </header>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr 340px",
                    gap: 14,
                    padding: "14px 18px",
                    alignItems: "stretch"
                }}
            >
                <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                    <Panel title="Ressourcen">
                        <ResRow label="Holz" value={st.inventory.wood} />
                        <ResRow label="Beeren" value={st.inventory.berries} />
                        <ResRow label="Stein" value={st.inventory.stone} />
                        <ResRow label="Fisch" value={st.inventory.fish} />
                        <ResRow label="Fasern" value={st.inventory.fibers} />
                    </Panel>

                    <Panel title="Status">
                        <MiniBadge label={`Phase: ${st.time.phase}`} />
                        <MiniBadge label={`Speed: ${st.speed}`} />
                        <MiniBadge label={`Buildings: ${buildings.length}`} />
                        <MiniBadge label={`Hunger: ${hunger}`} />
                    </Panel>

                    <Panel title="Build Mode">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {BUILDABLES.map(type => (
                                <Btn key={type} onClick={() => setBuildMode(mode => (mode === type ? null : type))} active={buildMode === type}>
                                    {type}
                                </Btn>
                            ))}
                            <Btn onClick={() => setBuildMode(null)} disabled={!buildMode}>
                                Clear
                            </Btn>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                            Hover: {hoverTile ? `${hoverTile.x},${hoverTile.y}` : "—"} · Tile: {hoveredTileId ?? "—"} · Spot: {hoverTile ? (canPlaceHover ? "frei" : "blockiert") : "—"}
                        </div>
                        {hoveredBuilding && (
                            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>Here: {hoveredBuilding.type}</div>
                        )}
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>Linke Maustaste: Platzieren · Rechtsklick/Escape: abbrechen · Shift+Drag oder Rechtsklick: Pan · Scroll: Zoom</div>
                    </Panel>
                </div>

                <div
                    style={{
                        position: "relative",
                        borderRadius: 18,
                        border: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                        background: "linear-gradient(180deg, #f7fafc, #e8eef5)",
                        overflow: "hidden",
                        minHeight: 640
                    }}
                >
                    <div style={{ position: "absolute", inset: 0, padding: 12 }}>
                        <WorldCanvas
                            st={st}
                            buildMode={buildMode}
                            onTileClick={handleTileClick}
                            onHover={setHoverTile}
                            onCancelBuild={() => setBuildMode(null)}
                        />
                    </div>

                    <div
                        style={{
                            position: "absolute",
                            left: 14,
                            top: 14,
                            padding: "8px 10px",
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.55)",
                            color: "white",
                            fontSize: 12,
                            display: "grid",
                            gap: 4,
                            minWidth: 180
                        }}
                    >
                        <div style={{ fontWeight: 700 }}>Welt</div>
                        <div>Grid: {st.world.width} x {st.world.height}</div>
                        <div>Build: {buildMode ?? "—"}</div>
                        <div>Hover: {hoverTile ? `${hoverTile.x},${hoverTile.y}` : "—"}</div>
                        <div>Tile: {hoveredTileId ?? "—"}</div>
                        <div>Placeable: {buildMode && hoverTile ? (canPlaceHover ? "yes" : "no") : "—"}</div>
                    </div>
                </div>

                <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                    <Panel title={`Villager (${aliveVillagers.length})`}>
                        <div style={{ display: "grid", gap: 10 }}>
                            {aliveVillagers.map(v => (
                                <div
                                    key={v.id}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr auto",
                                        gap: 10,
                                        alignItems: "center",
                                        padding: "8px 10px",
                                        borderRadius: 12,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        background: "rgba(255,255,255,0.65)"
                                    }}
                                >
                                    <div style={{ display: "grid", gap: 4 }}>
                                        <div style={{ fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                                            <span>{v.name}</span>
                                            <span style={{ fontSize: 12, opacity: 0.65 }}>({v.id})</span>
                                        </div>

                                        <div style={{ display: "flex", gap: 10, fontSize: 12, opacity: 0.85, flexWrap: "wrap" }}>
                                            <span>Hunger: {fmt(v.needs.hunger)}</span>
                                            <span>Energy: {fmt(v.needs.energy)}</span>
                                            <span>Morale: {fmt(v.stats.morale)}</span>
                                        </div>

                                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                                            Assigned: {v.assignedBuildingId ? v.assignedBuildingId : "—"}
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                                        <select
                                            value={v.job}
                                            onChange={e => {
                                                const job = e.target.value as VillagerJobId;
                                                setSt(prev => engine.commands.assignVillagerJob(prev, v.id, job));
                                            }}
                                            style={selStyle()}
                                        >
                                            {JOBS.map(j => (
                                                <option key={j} value={j}>
                                                    {j}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={v.assignedBuildingId ?? ""}
                                            onChange={e => {
                                                const id = e.target.value || null;
                                                setSt(prev => engine.commands.assignVillagerToBuilding(prev, v.id, id));
                                            }}
                                            style={selStyle()}
                                        >
                                            <option value="">(kein Gebäude)</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.type} @ {b.pos.x},{b.pos.y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Buildings">
                        <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ fontSize: 12, opacity: 0.8 }}>Manual place:</span>

                                <input
                                    value={px}
                                    onChange={e => setPx(toInt(e.target.value, px))}
                                    inputMode="numeric"
                                    style={inpStyle()}
                                />
                                <input
                                    value={py}
                                    onChange={e => setPy(toInt(e.target.value, py))}
                                    inputMode="numeric"
                                    style={inpStyle()}
                                />

                                <Btn
                                    onClick={() =>
                                        setSt(prev => engine.commands.placeBuilding(prev, "gather_hut", { x: px, y: py }))
                                    }
                                >
                                    Gather Hut
                                </Btn>
                            </div>

                            {buildings.length ? (
                                buildings.map(b => <BuildingRow key={b.id} b={b} st={st} setSt={setSt} />)
                            ) : (
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Noch keine Buildings.</div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Letztes Event">
                        {st.events.length ? (
                            <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 600 }}>{st.events[st.events.length - 1].id}</div>
                                <pre
                                    style={{
                                        margin: 0,
                                        padding: 10,
                                        borderRadius: 12,
                                        border: "1px solid rgba(0,0,0,0.10)",
                                        overflow: "auto",
                                        fontSize: 12,
                                        background: "rgba(0,0,0,0.03)"
                                    }}
                                >
                                    {JSON.stringify(st.events[st.events.length - 1].payload, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <div style={{ opacity: 0.7 }}>—</div>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}

function BuildingRow({
    b,
    st,
    setSt
}: {
    b: Building;
    st: GameState;
    setSt: React.Dispatch<React.SetStateAction<GameState>>;
}) {
    const workers = b.assignedVillagerIds.length;
    const t = b.task;
    const dur = t.duration || 0;
    const pct = dur > 0 ? Math.round((t.progress / dur) * 100) : 0;

    return (
        <div
            style={{
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.10)",
                display: "grid",
                gap: 8
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>
                        {b.type} <span style={{ fontWeight: 400, opacity: 0.7 }}>({b.id})</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Pos: {b.pos.x},{b.pos.y} · Workers: {workers}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                        onClick={() => setSt(prev => engine.commands.collectFromBuilding(prev, b.id))}
                        disabled={!t.collectable}
                    >
                        Collect
                    </Btn>
                </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Task: {t.kind} · {t.collectable ? "collectable" : "running"} · {t.progress}/{t.duration} ({pct}%)
                </div>

                <div style={{ height: 10, borderRadius: 999, border: "1px solid rgba(0,0,0,0.12)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "rgba(0,0,0,0.20)" }} />
                </div>
            </div>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.7)",
                boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
                backdropFilter: "blur(6px)",
                display: "grid",
                gap: 8
            }}
        >
            <div style={{ fontWeight: 700, letterSpacing: -0.1 }}>{title}</div>
            {children}
        </div>
    );
}

function ResRow({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ opacity: 0.9 }}>{label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function MiniBadge({ label }: { label: string }) {
    return (
        <div
            style={{
                padding: "6px 8px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(15,23,42,0.04)",
                fontSize: 12,
                width: "fit-content"
            }}
        >
            {label}
        </div>
    );
}

function Btn({
    children,
    onClick,
    disabled,
    active
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: active ? "1px solid #0f172a" : "1px solid rgba(0,0,0,0.14)",
                background: disabled ? "rgba(0,0,0,0.04)" : active ? "#0f172a" : "white",
                color: active ? "white" : "#0f172a",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                transition: "background 120ms ease, color 120ms ease, border-color 120ms ease"
            }}
        >
            {children}
        </button>
    );
}

function fmt(n: number) {
    return (Math.round(n * 100) / 100).toFixed(2);
}

function toInt(v: string, fallback: number) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
}

function selStyle(): React.CSSProperties {
    return {
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.14)",
        background: "white",
        fontSize: 13,
        cursor: "pointer"
    };
}

function inpStyle(): React.CSSProperties {
    return {
        width: 64,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.14)",
        background: "white",
        fontSize: 13
    };
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
