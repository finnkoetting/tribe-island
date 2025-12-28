"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as engine from "../../src/game/engine";
import { canPlaceAt } from "../../src/game/domains/world/rules/canPlaceAt";
import type {
    Building,
    BuildingTypeId,
    GameState,
    Vec2,
    VillagerJobId
} from "../../src/game/types/GameState";
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
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h1 style={{ fontSize: 18, margin: 0 }}>Tribez – Debug</h1>

                <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 0 }))}>Pause</Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 1 }))}>Normal</Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 2 }))}>Fast</Btn>
                    <Btn
                        onClick={() => {
                            lastRef.current = 0;
                            setSt(engine.create.createGame());
                            setPx(32);
                            setPy(32);
                        }}
                    >
                        New Game
                    </Btn>
                </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <Badge label={`Tag ${st.time.day}`} />
                <Badge label={`Phase: ${st.time.phase}`} />
                <Badge label={`Speed: ${st.speed === 0 ? "Pause" : st.speed === 1 ? "Normal" : "Fast"}`} />
                <Badge label={`Beeren: ${st.inventory.berries}`} />
                <Badge label={`Hunger-Alert: ${hunger}`} />
                <Badge label={`Buildings: ${buildings.length}`} />
                <Badge label={`Uhr: ${formatClock(st)}`} />
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "linear-gradient(135deg, #f7fbff, #eef3ff)"
                    }}
                >
                    <div style={{ fontWeight: 600 }}>Build Mode</div>
                    {BUILDABLES.map(type => (
                        <Btn key={type} onClick={() => setBuildMode(mode => (mode === type ? null : type))} active={buildMode === type}>
                            {type}
                        </Btn>
                    ))}
                    <Btn onClick={() => setBuildMode(null)} disabled={!buildMode}>
                        Clear
                    </Btn>
                    <div style={{ fontSize: 12, opacity: 0.8, display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Hover: {hoverTile ? `${hoverTile.x},${hoverTile.y}` : "—"}</span>
                        <span>Tile: {hoveredTileId ?? "—"}</span>
                        <span>
                            Spot: {hoverTile ? (canPlaceHover ? "frei" : "blockiert") : "—"}
                        </span>
                        {hoveredBuilding && <span>Building: {hoveredBuilding.type}</span>}
                    </div>
                </div>

                <div
                    style={{
                        position: "relative",
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "linear-gradient(180deg, #f4f7fb, #e9eef5)",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                        overflow: "hidden"
                    }}
                >
                    <div style={{ overflow: "auto", padding: 12 }}>
                        <WorldCanvas st={st} buildMode={buildMode} onTileClick={handleTileClick} onHover={setHoverTile} />
                    </div>

                    <div
                        style={{
                            position: "absolute",
                            right: 12,
                            top: 12,
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.55)",
                            color: "white",
                            fontSize: 12,
                            display: "grid",
                            gap: 4,
                            minWidth: 200
                        }}
                    >
                        <div style={{ fontWeight: 700 }}>World Canvas</div>
                        <div>Tiles: {st.world.width} x {st.world.height}</div>
                        <div>Build: {buildMode ?? "—"}</div>
                        <div>Hover: {hoverTile ? `${hoverTile.x},${hoverTile.y}` : "—"}</div>
                        <div>Tile: {hoveredTileId ?? "—"}</div>
                        <div>Placeable: {buildMode && hoverTile ? (canPlaceHover ? "yes" : "no") : "—"}</div>
                        {hoveredBuilding && <div>Here: {hoveredBuilding.type}</div>}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
                <Card title="Ressourcen">
                    <Row k="Holz" v={st.inventory.wood} />
                    <Row k="Beeren" v={st.inventory.berries} />
                    <Row k="Stein" v={st.inventory.stone} />
                    <Row k="Fisch" v={st.inventory.fish} />
                </Card>

                <Card title={`Villager (${aliveVillagers.length})`}>
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
                                    border: "1px solid rgba(0,0,0,0.10)"
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
                </Card>

                <Card title="Buildings">
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Place:</span>

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

                            <Btn
                                onClick={() => {
                                    const x = 28 + Math.floor(Math.random() * 8);
                                    const y = 28 + Math.floor(Math.random() * 8);
                                    setPx(x);
                                    setPy(y);
                                    setSt(prev => engine.commands.placeBuilding(prev, "gather_hut", { x, y }));
                                }}
                            >
                                Random near center
                            </Btn>
                        </div>

                        {buildings.length ? (
                            buildings.map(b => <BuildingRow key={b.id} b={b} st={st} setSt={setSt} />)
                        ) : (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Noch keine Buildings.</div>
                        )}
                    </div>
                </Card>

                <Card title="Letztes Event">
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
                </Card>
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

function Badge({ label }: { label: string }) {
    return (
        <div
            style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(0,0,0,0.03)",
                fontSize: 12
            }}
        >
            {label}
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                minWidth: 340,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(0,0,0,0.02)"
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ k, v }: { k: string; v: number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ opacity: 0.9 }}>{k}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{v}</span>
        </div>
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
