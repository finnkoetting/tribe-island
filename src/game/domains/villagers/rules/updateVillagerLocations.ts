import { Building, GameState, Vec2, Villager } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";

const WALK_SPEED_TILES_PER_SEC = 1.6;
const ARRIVE_EPS = 0.02;
const MIN_FACING_STEP = 1e-4;
const HARVEST_RADIUS = 0.55;

const HARVEST_YIELD: Partial<Record<Building["type"], { resource: keyof GameState["inventory"]; amount: number }>> = {
    tree: { resource: "wood", amount: 3 },
    berry_bush: { resource: "berries", amount: 2 },
    mushroom: { resource: "berries", amount: 1 }
};

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

function resolveFacing(dx: number, dy: number, prev: Villager["facing"]): Villager["facing"] {
    const screenDx = dx - dy;
    if (Math.abs(screenDx) < MIN_FACING_STEP) return prev;
    return screenDx >= 0 ? "right" : "left";
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
    homePos: Vec2 | null,
    job: Villager["job"]
): Vec2 | null {
    const resourceTarget = resolveJobTarget(st, villagerPos, job, st.flags.working);
    if (resourceTarget) return resourceTarget;

    const campfirePos = nearestCampfire(campfires, villagerPos);

    if (st.flags.sleeping) {
        return homePos ?? campfirePos;
    }

    if (st.flags.working && workPos) {
        return workPos;
    }

    return campfirePos;
}

function resolveJobTarget(st: GameState, villagerPos: Vec2, job: Villager["job"], working: boolean): Vec2 | null {
    if (!working) return null;
    if (job !== "gatherer" && job !== "woodcutter") return null;

    const nearest = nearestHarvestable(st, villagerPos, job === "woodcutter" ? ["tree"] : ["berry_bush", "mushroom"]);
    return nearest?.pos ?? null;
}

function nearestHarvestable(st: GameState, villagerPos: Vec2, allowed: Array<Building["type"]>) {
    let best: { pos: Vec2; buildingId: string } | null = null;
    let bestDist = Infinity;

    for (const b of Object.values(st.buildings)) {
        if (!allowed.includes(b.type)) continue;
        const pos = buildingAnchorPos(b);
        const dist = Math.hypot(pos.x - villagerPos.x, pos.y - villagerPos.y);
        if (dist < bestDist) {
            bestDist = dist;
            best = { pos, buildingId: b.id };
        }
    }

    return best;
}

export function updateVillagerLocations(st: GameState, dtMs: number): GameState {
    if (dtMs <= 0) return st;

    const campfires = resolveCampfirePositions(st);

    let changed = false;
    const nextVillagers: GameState["villagers"] = {};
    let buildings = st.buildings;
    let inventory = st.inventory;
    let events = st.events;

    for (const v of Object.values(st.villagers)) {
        if (v.state !== "alive") {
            nextVillagers[v.id] = v;
            continue;
        }

        const stateWithBuildings = buildings === st.buildings ? st : { ...st, buildings };

        const workPos = resolveWorkPos(stateWithBuildings, v.assignedBuildingId);
        const homePos = resolveHomePos(stateWithBuildings, v.homeBuildingId);
        const target = pickTargetPosition(stateWithBuildings, campfires, v.pos, workPos, homePos, v.job);

        let nextVillager: Villager = v;

        if (target) {
            const dx = target.x - v.pos.x;
            const dy = target.y - v.pos.y;
            const dist = Math.hypot(dx, dy);

            if (dist > ARRIVE_EPS) {
                const maxStep = (dtMs / 1000) * WALK_SPEED_TILES_PER_SEC;
                const step = dist <= maxStep ? dist : maxStep;
                const nx = v.pos.x + (dx / dist) * step;
                const ny = v.pos.y + (dy / dist) * step;

                const facing = resolveFacing(dx, dy, v.facing);
                nextVillager = { ...v, pos: { x: nx, y: ny }, facing };
                if (step > 0) changed = true;
            }
        }

        const harvest = harvestNearby(buildings, nextVillager.pos, v.job, inventory, st.nowMs);
        if (harvest.harvested) {
            buildings = harvest.buildings;
            inventory = harvest.inventory;
            if (harvest.event) events = events.concat(harvest.event);
            changed = true;
        }

        nextVillagers[v.id] = nextVillager;
    }

    if (!changed) return st;

    return {
        ...st,
        villagers: nextVillagers,
        buildings,
        inventory,
        events
    };
}

function harvestNearby(
    buildings: GameState["buildings"],
    pos: Vec2,
    job: Villager["job"],
    inventory: GameState["inventory"],
    nowMs: number
): {
    harvested: boolean;
    buildings: GameState["buildings"];
    inventory: GameState["inventory"];
    event: GameState["events"][number] | null;
} {
    const allowed = job === "woodcutter" ? ["tree"] : job === "gatherer" ? ["berry_bush", "mushroom"] : [];
    if (!allowed.length) return { harvested: false, buildings, inventory, event: null };

    let targetId: string | null = null;
    let targetType: Building["type"] | null = null;

    for (const b of Object.values(buildings)) {
        if (!allowed.includes(b.type)) continue;
        const anchor = buildingAnchorPos(b);
        const dist = Math.hypot(anchor.x - pos.x, anchor.y - pos.y);
        if (dist <= HARVEST_RADIUS) {
            targetId = b.id;
            targetType = b.type;
            break;
        }
    }

    if (!targetId || !targetType) return { harvested: false, buildings, inventory, event: null };

    const yieldInfo = HARVEST_YIELD[targetType];
    const nextBuildings = { ...buildings };
    delete nextBuildings[targetId];

    if (!yieldInfo) return { harvested: true, buildings: nextBuildings, inventory, event: null };

    const { resource, amount } = yieldInfo;
    const nextInventory = {
        ...inventory,
        [resource]: (inventory[resource] ?? 0) + amount
    };

    const event = {
        id: "resource_added" as const,
        atMs: nowMs,
        payload: { resource, amount, source: job, buildingId: targetId }
    };

    return { harvested: true, buildings: nextBuildings, inventory: nextInventory, event };
}
