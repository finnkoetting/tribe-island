import { GameState, Vec2 } from "../../../types/GameState";

function hashId(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function updateAnimalLocations(st: GameState, dtMs: number): GameState {
    if (dtMs <= 0) return st;
    if (!st.animals) return st;

    let changed = false;
    const nextAnimals: GameState["animals"] = {};

    for (const a of Object.values(st.animals)) {
        // simple wandering for alive animals
        if (a.state === "dead") {
            nextAnimals[a.id] = a;
            continue;
        }

        const baseTileX = Math.floor(a.pos.x);
        const baseTileY = Math.floor(a.pos.y);
        const anchor: Vec2 = {
            x: baseTileX + 0.25 + ((hashId(a.id) % 100) / 100) * 0.5,
            y: baseTileY + 0.25 + (((hashId(a.id) >>> 8) % 100) / 100) * 0.5
        };

        const seed = hashId(a.id);
        const period = 3000 + (seed % 4000); // 3-7s
        const t = (st.nowMs % period) / period;
        const angle = t * Math.PI * 2 + ((seed >>> 16) % 1000) / 1000;
        const radius = 0.3 + ((seed >>> 4) % 100) / 100 * 0.6; // 0.3-0.9

        const target: Vec2 = {
            x: anchor.x + Math.cos(angle) * radius,
            y: anchor.y + Math.sin(angle) * radius * 0.85
        };

        const dx = target.x - a.pos.x;
        const dy = target.y - a.pos.y;
        const dist = Math.hypot(dx, dy);
        const maxStep = (dtMs / 1000) * 0.9; // ~0.9 tiles/sec

        let nextPos = a.pos;
        if (dist > 1e-4) {
            const step = dist <= maxStep ? dist : maxStep;
            nextPos = { x: a.pos.x + (dx / dist) * step, y: a.pos.y + (dy / dist) * step };
            changed = true;
        }

        nextAnimals[a.id] = { ...a, pos: nextPos };
    }

    if (!changed) return st;

    return { ...st, animals: nextAnimals };
}
