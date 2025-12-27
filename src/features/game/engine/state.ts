import { GameState } from "../types";
import { BUILD_H, BUILD_W } from "./defs";

export const createState = (): GameState => ({
  w: BUILD_W,
  h: BUILD_H,
  tick: 0,
  sel: null,
  res: { wood: 30, food: 10, gems: 0, pop: 0, cap: 0 },
  grid: Array.from({ length: BUILD_H }, () => Array.from({ length: BUILD_W }, () => null)),
  claimed: {}
});
