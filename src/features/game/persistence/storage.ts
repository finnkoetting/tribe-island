import { GameState } from "../types";
import { createState } from "../engine";
import { pack, unpack } from "./migrate";

const KEY = "tribe_island_save";

export const saveGame = (s: GameState) => {
    localStorage.setItem(KEY, JSON.stringify(pack(s)));
};

export const loadGame = (): GameState => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createState();
    return unpack(raw);
};

export const clearSave = () => {
    localStorage.removeItem(KEY);
};
