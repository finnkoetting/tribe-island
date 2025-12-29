import { Building, GameState, Vec2 } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";

const WALK_SPEED_TILES_PER_SEC = 1.6;
const ARRIVE_EPS = 0.02;

function buildingAnchorPos(building: Building): Vec2 {
    const size = getBuildingSize(building.type);
    const cx = building.pos.x + Math.floor(size.w / 2);
    const cy = building.pos.y + Math.floor(size.h / 2);
    return { x: cx, y: cy };
}

function resolveCampfirePositions(st: GameState): Vec2[] {
    return Object.values(st.buildings)
        .filter(b => b.type === "campfire")
        .map(buildingAnchorPos);
}

function nearestCampfire(campfires: Vec2[], origin: Vec2): Vec2 | null {
    if (!campfires.length) return null;
    let best = campfires[0];
    let bestDist = distanceSq(origin, best);

    for (let i = 1; i < campfires.length; i++) {
        const d = distanceSq(origin, campfires[i]);
        if (d < bestDist) {
            bestDist = d;
            best = campfires[i];
        }
    }
    return best;
}

function distanceSq(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function resolveHomePos(st: GameState, villagerHomeId: string | null): Vec2 | null {
    if (!villagerHomeId) return null;
    const home = st.buildings[villagerHomeId];
    return home ? buildingAnchorPos(home) : null;
}

function resolveWorkPos(st: GameState, assignedBuildingId: string | null): Vec2 | null {
    if (!assignedBuildingId) return null;
    const work = st.buildings[assignedBuildingId];
    return work ? buildingAnchorPos(work) : null;
}

function pickTargetPosition(
    st: GameState,
    campfires: Vec2[],
    villagerPos: Vec2,
    workPos: Vec2 | null,
    homePos: Vec2 | null
): Vec2 | null {
    const campfirePos = nearestCampfire(campfires, villagerPos);

    if (st.flags.sleeping) {
        return homePos ?? campfirePos;
    }

    if (st.flags.working && workPos) {
        return workPos;
    }

    return campfirePos;
}

export function updateVillagerLocations(st: GameState, dtMs: number): GameState {
    if (dtMs <= 0) return st;

    const campfires = resolveCampfirePositions(st);

    let changed = false;
    const nextVillagers: GameState["villagers"] = {};

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }

        const workPos = resolveWorkPos(st, v.assignedBuildingId);
        const homePos = resolveHomePos(st, v.homeBuildingId);
        const target = pickTargetPosition(st, campfires, v.pos, workPos, homePos);

        if (!target) {
            nextVillagers[v.id] = v;
            continue;
        }

        const dx = target.x - v.pos.x;
        const dy = target.y - v.pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= ARRIVE_EPS) {
            nextVillagers[v.id] = v;
            continue;
        }

        const maxStep = (dtMs / 1000) * WALK_SPEED_TILES_PER_SEC;
        const step = dist <= maxStep ? dist : maxStep;
        const nx = v.pos.x + (dx / dist) * step;
        const ny = v.pos.y + (dy / dist) * step;

        nextVillagers[v.id] = { ...v, pos: { x: nx, y: ny } };
        if (step > 0) changed = true;
    }

    return changed ? { ...st, villagers: nextVillagers } : st;
}
