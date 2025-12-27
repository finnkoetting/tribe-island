import { GameState } from "../types";
import { createState } from "../engine";

export const SAVE_VERSION = 1;

type SaveBlob = {
  v: number;
  state: GameState;
};

export const pack = (state: GameState): SaveBlob => ({
  v: SAVE_VERSION,
  state
});

export const unpack = (raw: string): GameState => {
  try {
    const d = JSON.parse(raw) as SaveBlob;

    if (!d || typeof d !== "object") return createState();
    if (!("state" in d)) return createState();

    if (d.v === 1) {
      return d.state;
    }

    return createState();
  } catch {
    return createState();
  }
};
