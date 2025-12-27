"use client";

import { useCallback, useRef, useState, useEffect } from "react";
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

    const onPlace = useCallback((x: number, y: number) => {
        setSt(prev => {
            const r = gameReduce(prev, { type: "PLACE", x, y });
            popToast(r.place?.ok ? "Baustelle" : "Nicht möglich", r.place?.msg || "");
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
                <WorldCanvas st={st} onPlace={onPlace} onCancel={onCancel} />
                <QuestDrawer st={st} onClaim={onClaim} />
                <Buildbar st={st} order={BUILD_ORDER} onSelect={onSelect} onSave={onSave} onReset={onReset} />
                <Toast data={toast} />
            </div>
        </div>
    );
}
