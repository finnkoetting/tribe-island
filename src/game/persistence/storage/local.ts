import { GameState } from "../../types/GameState";

const STORAGE_KEY = "tribe-island/save/v1";

export type LoadedGame = {
    state: GameState;
    savedAt: number | null;
    version: number;
};

export function saveGameState(state: GameState): number | null {
    if (typeof localStorage === "undefined") return null;
    const savedAt = Date.now();
    try {
        const payload = { version: state.version ?? 1, savedAt, state };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return savedAt;
    } catch (err) {
        console.warn("Failed to save game", err);
        return null;
    }
}

export function loadGameState(): LoadedGame | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<LoadedGame> & { state?: GameState };
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.state || typeof parsed.state !== "object") return null;
        const version = typeof parsed.version === "number" ? parsed.version : parsed.state.version ?? 0;
        const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : null;
        return { state: parsed.state, savedAt, version };
    } catch (err) {
        console.warn("Failed to load game save", err);
        return null;
    }
}

export function clearSavedGame() {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}
