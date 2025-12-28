"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as engine from "../../src/game/engine";
import type { GameState, VillagerJobId } from "../../src/game/types/GameState";

const JOBS: VillagerJobId[] = ["idle", "gatherer", "builder", "researcher", "fisher", "guard"];

export default function DebugClient() {
    const [st, setSt] = useState<GameState>(() => engine.create.createGame());
    const lastRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);

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

    return (
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Debug</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Tag {st.time.day} · {formatClock(st)} · Phase {st.time.phase} · Working {st.flags.working ? "yes" : "no"} ·
                        Sleeping {st.flags.sleeping ? "yes" : "no"}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 0 }))}>Pause</Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 1 }))}>Normal</Btn>
                    <Btn onClick={() => setSt(s => ({ ...s, speed: 2 }))}>Fast</Btn>
                    <Btn
                        onClick={() => {
                            lastRef.current = 0;
                            setSt(engine.create.createGame());
                        }}
                    >
                        Reset State
                    </Btn>
                </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <Badge label={`Beeren: ${st.inventory.berries}`} />
                <Badge label={`Holz: ${st.inventory.wood}`} />
                <Badge label={`Stein: ${st.inventory.stone}`} />
                <Badge label={`Fisch: ${st.inventory.fish}`} />
                <Badge label={`Villager: ${aliveVillagers.length}`} />
                <Badge label={`Buildings: ${buildings.length}`} />
                <Badge label={`Events: ${st.events.length}`} />
                <Badge label={`Hunger Alert: ${st.alerts?.hunger?.severity ?? 0}`} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, marginTop: 14 }}>
                <Card title="Cheats / Tools">
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn onClick={() => setSt(s => addRes(s, "berries", 50))}>+50 Beeren</Btn>
                            <Btn onClick={() => setSt(s => addRes(s, "wood", 50))}>+50 Holz</Btn>
                            <Btn onClick={() => setSt(s => addRes(s, "stone", 50))}>+50 Stein</Btn>
                            <Btn onClick={() => setSt(s => addRes(s, "fish", 50))}>+50 Fisch</Btn>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn onClick={() => setSt(s => ({ ...s, flags: { ...s.flags, paused: !s.flags.paused } }))}>
                                Toggle PauseFlag
                            </Btn>
                            <Btn onClick={() => setSt(s => ({ ...s, flags: { ...s.flags, working: !s.flags.working } }))}>
                                Toggle Working
                            </Btn>
                            <Btn onClick={() => setSt(s => ({ ...s, flags: { ...s.flags, sleeping: !s.flags.sleeping } }))}>
                                Toggle Sleeping
                            </Btn>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn onClick={() => setSt(s => engine.commands.placeBuilding(s, "gather_hut", nearCenter(s)))}>
                                Place Gather Hut (center-ish)
                            </Btn>
                            <Btn onClick={() => setSt(s => assignAllJobs(s, "gatherer"))}>Set all → gatherer</Btn>
                            <Btn
                                onClick={() => {
                                    const b = Object.values(st.buildings)[0];
                                    const v = Object.values(st.villagers)[0];
                                    if (!b || !v) return;
                                    setSt(s => engine.commands.assignVillagerToBuilding(s, v.id, b.id));
                                }}
                            >
                                Assign v1 → b1
                            </Btn>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
                            Tipp: Wenn Building-Progress nicht läuft, check oben <b>Working</b>. Ab 08:00 oder per Toggle.
                        </div>
                    </div>
                </Card>

                <Card title="State Inspector">
                    <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ minWidth: 220 }}>
                                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Villager Jobs</div>
                                <div style={{ display: "grid", gap: 8 }}>
                                    {aliveVillagers.map(v => (
                                        <div
                                            key={v.id}
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr auto",
                                                gap: 10,
                                                alignItems: "center",
                                                padding: 10,
                                                borderRadius: 12,
                                                border: "1px solid rgba(0,0,0,0.10)"
                                            }}
                                        >
                                            <div style={{ display: "grid", gap: 3 }}>
                                                <div style={{ fontWeight: 700 }}>{v.name}</div>
                                                <div style={{ fontSize: 12, opacity: 0.75 }}>
                                                    H {fmt(v.needs.hunger)} · E {fmt(v.needs.energy)} · M {fmt(v.stats.morale)}
                                                </div>
                                                <div style={{ fontSize: 12, opacity: 0.75 }}>
                                                    Building: {v.assignedBuildingId ?? "—"}
                                                </div>
                                            </div>

                                            <select
                                                value={v.job}
                                                onChange={e => {
                                                    const job = e.target.value as VillagerJobId;
                                                    setSt(s => engine.commands.assignVillagerJob(s, v.id, job));
                                                }}
                                                style={selStyle()}
                                            >
                                                {JOBS.map(j => (
                                                    <option key={j} value={j}>
                                                        {j}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: 280 }}>
                                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Buildings</div>
                                <div style={{ display: "grid", gap: 8 }}>
                                    {buildings.length ? (
                                        buildings.map(b => {
                                            const dur = Math.max(1, b.task.duration);
                                            const pct = Math.round((b.task.progress / dur) * 100);
                                            return (
                                                <div
                                                    key={b.id}
                                                    style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)" }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                                        <div style={{ fontWeight: 800 }}>
                                                            {b.type} <span style={{ fontWeight: 400, opacity: 0.7 }}>({b.id})</span>
                                                        </div>
                                                        <Btn
                                                            onClick={() => setSt(s => engine.commands.collectFromBuilding(s, b.id))}
                                                            disabled={!b.task.collectable}
                                                        >
                                                            Collect
                                                        </Btn>
                                                    </div>

                                                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                                                        Pos {b.pos.x},{b.pos.y} · Workers {b.assignedVillagerIds.length} · {b.task.progress}/
                                                        {b.task.duration} ({pct}%)
                                                    </div>

                                                    <div
                                                        style={{
                                                            height: 10,
                                                            marginTop: 8,
                                                            borderRadius: 999,
                                                            border: "1px solid rgba(0,0,0,0.12)",
                                                            overflow: "hidden"
                                                        }}
                                                    >
                                                        <div style={{ width: `${pct}%`, height: "100%", background: "rgba(0,0,0,0.22)" }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ fontSize: 12, opacity: 0.7 }}>Keine Buildings.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Raw JSON (GameState)</div>
                            <pre
                                style={{
                                    margin: 0,
                                    padding: 12,
                                    borderRadius: 12,
                                    border: "1px solid rgba(0,0,0,0.10)",
                                    background: "rgba(0,0,0,0.03)",
                                    maxHeight: 420,
                                    overflow: "auto",
                                    fontSize: 12
                                }}
                            >
                                {JSON.stringify(st, null, 2)}
                            </pre>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function addRes(st: GameState, k: keyof GameState["inventory"], amount: number): GameState {
    return {
        ...st,
        inventory: { ...st.inventory, [k]: st.inventory[k] + amount }
    };
}

function assignAllJobs(st: GameState, job: VillagerJobId): GameState {
    let next = st;
    for (const v of Object.values(st.villagers)) {
        next = engine.commands.assignVillagerJob(next, v.id, job);
    }
    return next;
}

function nearCenter(st: GameState) {
    const x = Math.floor(st.world.width / 2) + Math.floor(Math.random() * 6) - 3;
    const y = Math.floor(st.world.height / 2) + Math.floor(Math.random() * 6) - 3;
    return { x: Math.max(0, Math.min(st.world.width - 1, x)), y: Math.max(0, Math.min(st.world.height - 1, y)) };
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

function Btn({
    children,
    onClick,
    disabled
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: disabled ? "rgba(0,0,0,0.05)" : "white",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1
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
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "rgba(0,0,0,0.02)" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
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

function fmt(n: number) {
    return (Math.round(n * 100) / 100).toFixed(2);
}
