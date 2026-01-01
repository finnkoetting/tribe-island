"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./loading.module.css";

type Step = { id: string; label: string; status: "todo" | "wip" | "done" };

export default function LoadingOverlay({ steps }: { steps: Step[] }) {
    const wip = steps.find(s => s.status === "wip");
    const current = wip ?? steps.find(s => s.status === "todo") ?? steps[steps.length - 1];
    const gameName = process.env.NEXT_PUBLIC_GAME_NAME ?? "Tribe Island";

    const [displayPct, setDisplayPct] = useState(0);
    const wipStartRef = useRef<number | null>(null);
    const wipIdRef = useRef<string | null>(null);

    // Track when the current wip step started to provide time-based movement
    useEffect(() => {
        if (wip?.id !== wipIdRef.current) {
            wipIdRef.current = wip?.id ?? null;
            wipStartRef.current = wip ? performance.now() : null;
        }
    }, [wip?.id, wip]);

    // Smoothly advance displayPct toward a time-based target derived from steps
    useEffect(() => {
        const interval = setInterval(() => {
            const total = steps.length || 1;
            const completed = steps.filter(s => s.status === "done").length;
            const activeWip = steps.find(s => s.status === "wip");

            const wipElapsed = activeWip && wipStartRef.current ? performance.now() - wipStartRef.current : 0;
            const wipProgress = activeWip ? Math.min(0.85, wipElapsed / 1800) * (1 / total) : 0; // allow visible creep during wip
            const base = completed / total;
            const target = Math.min(100, (base + wipProgress) * 100);

            setDisplayPct(prev => {
                const delta = target - prev;
                if (Math.abs(delta) < 0.2) return target;
                const step = Math.sign(delta) * Math.min(Math.abs(delta), 1.8);
                return Math.max(0, Math.min(100, prev + step));
            });
        }, 50);
        return () => clearInterval(interval);
    }, [steps]);

    useEffect(() => {
        // small visual update tick
        const id = setInterval(() => {}, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className={styles.loading} style={{ position: "fixed", inset: 0, zIndex: 120 }}>
            <div className={styles.centerBrand}>{gameName}</div>
            <div className={styles.bottomBar}>
                <div className={styles.bottomBarContent}>
                    <div className={styles.bottomTrack}>
                        <div className={styles.bottomFill} style={{ width: `${displayPct}%` }} />
                        <div className={styles.bottomPctInside}>{Math.round(displayPct)}%</div>
                    </div>
                </div>
                <div className={styles.bottomSub}>{current?.label ?? "Initialisiere"}</div>
            </div>
        </div>
    );
}
