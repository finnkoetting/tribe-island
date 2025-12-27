"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ui from "@/styles/ui.module.scss";

import { BUILD_ORDER, QUESTS } from "../engine";
import { gameReduce, saveGame, loadGame, clearSave } from "../uiGlue";

import Topbar from "./Topbar";
import Buildbar from "./Buildbar";
import QuestDrawer from "./QuestDrawer";
import WorldCanvas from "./WorldCanvas";
import Toast from "./Toast";

import type { BuildingKey, GameState } from "../types";

export default function GameShell() {
    const [st, setSt] = useState<GameState>(() => loadGame());
    const [toast, setToast] = useState<{ t: string; m: string; on: boolean }>({ t: "", m: "", on: false });

    const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const popToast = useCallback((t: string, m: string) => {
        setToast({ t, m, on: true });
        if (toRef.current) clearTimeout(toRef.current);
        toRef.current = setTimeout(() => setToast(v => ({ ...v, on: false })), 1400);
    }, []);

    useEffect(() => {
        const iv = setInterval(() => {
            setSt(prev => gameReduce(prev, { type: "TICK" }).state);
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const onSelect = useCallback((k: BuildingKey) => {
        setSt(prev => gameReduce(prev, { type: "SELECT_BUILDING", key: k }).state);
    }, []);

    const onCancel = useCallback(() => {
        setSt(prev => gameReduce(prev, { type: "CANCEL_SELECTION" }).state);
    }, []);

    const onTileClick = useCallback((x: number, y: number) => {
        setSt(prev => {
            if (prev.sel) {
                const r = gameReduce(prev, { type: "PLACE", x, y });
                popToast(r.result?.ok ? "Baustelle" : "Nicht möglich", r.result?.msg || "");
                return r.state;
            }

            const cell = prev.grid[y]?.[x];
            if (!cell) {
                popToast("Info", "Hier ist nichts");
                return prev;
            }

            if (!cell.done) {
                popToast("Info", "Wird gerade gebaut");
                return prev;
            }

            if (cell.job?.state === "ready") {
                const r = gameReduce(prev, { type: "COLLECT", x, y });
                popToast(r.result?.ok ? "Collect" : "Nicht möglich", r.result?.msg || "");
                return r.state;
            }

            const r = gameReduce(prev, { type: "START_JOB", x, y });
            popToast(r.result?.ok ? "Aktion" : "Nicht möglich", r.result?.msg || "");
            return r.state;
        });
    }, [popToast]);

    const onClaim = useCallback((qid: string) => {
        const q = QUESTS.find(x => x.id === qid);
        if (!q) return;

        setSt(prev => {
            const r = gameReduce(prev, { type: "CLAIM", quest: q });
            if (r.claimed) popToast("Belohnung", `Quest abgeschlossen: ${q.name}`);
            return r.state;
        });
    }, [popToast]);

    const onSave = useCallback(() => {
        saveGame(st);
        popToast("Save", "Fortschritt gespeichert");
    }, [st, popToast]);

    const onReset = useCallback(() => {
        clearSave();
        const r = gameReduce(st, { type: "RESET" });
        setSt(r.state);
        popToast("Reset", "Neues Dorf gestartet");
    }, [st, popToast]);

    return (
        <div className={ui.shell}>
            <Topbar st={st} />

            <div className={ui.stage}>
                <WorldCanvas st={st} onPlace={onTileClick} onCancel={onCancel} />
                <QuestDrawer st={st} onClaim={onClaim} />
                <Buildbar st={st} order={BUILD_ORDER} onSelect={onSelect} onSave={onSave} onReset={onReset} />
                <Toast data={toast} />
            </div>
        </div>
    );
}
