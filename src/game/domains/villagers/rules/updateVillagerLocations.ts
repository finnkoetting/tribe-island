import { Building, GameState, Vec2, Villager } from "../../../types/GameState";
import { getBuildingSize } from "../../buildings/model/buildingSizes";

const WALK_SPEED_TILES_PER_SEC = 1.6;
const ARRIVE_EPS = 0.02;
const MIN_FACING_STEP = 1e-4;
const HARVEST_RADIUS = 0.55;
const FACING_COOLDOWN_MS = 3000;
const FACING_DIST_EPS = 0.35; // avoid jitter near target
const FACING_SCREEN_EPS = 0.1; // minimum projected delta to consider flipping

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
    job: Villager["job"],
    assignedBuildingId: string | null
): Vec2 | null {
    const resourceTarget = resolveJobTarget(st, villagerPos, job, st.flags.working, assignedBuildingId);
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

function resolveJobTarget(
    st: GameState,
    villagerPos: Vec2,
    job: Villager["job"],
    working: boolean,
    assignedBuildingId: string | null
): Vec2 | null {
    if (!working) return null;
    if (job !== "gatherer" && job !== "woodcutter") return null;

    const assigned = assignedBuildingId ? st.buildings[assignedBuildingId] : null;
    const allowedBuildingType = job === "gatherer" ? "gather_hut" : "sawmill";

    // Must be assigned to the correct gathering building and have an active task.
    if (!assigned || assigned.type !== allowedBuildingType) return null;
    const taskActive = assigned.task.kind !== "none" && !assigned.task.blocked && assigned.task.duration > 0;
    if (!taskActive) return null;

    const assignedCollectable = assigned.task.collectable;

    // When the building has finished its task, head back to the hut and wait.
    if (assignedCollectable && assigned) {
        return buildingAnchorPos(assigned);
    }

    const nearest = nearestHarvestable(st, villagerPos, job === "woodcutter" ? ["tree"] : ["berry_bush", "mushroom"]);
    if (!nearest) return null;

    // If already at the resource, stay in place (simulate working at the node).
    const dist = Math.hypot(nearest.pos.x - villagerPos.x, nearest.pos.y - villagerPos.y);
    if (dist <= HARVEST_RADIUS) return villagerPos;

    return nearest.pos;
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
        const target = pickTargetPosition(stateWithBuildings, campfires, v.pos, workPos, homePos, v.job, v.assignedBuildingId);

        let nextVillager: Villager = v;
        let idleWanderApplied = false;

        if (target) {
            const dx = target.x - v.pos.x;
            const dy = target.y - v.pos.y;
            const dist = Math.hypot(dx, dy);

            if (dist > ARRIVE_EPS) {
                const maxStep = (dtMs / 1000) * WALK_SPEED_TILES_PER_SEC;
                const step = dist <= maxStep ? dist : maxStep;
                const nx = v.pos.x + (dx / dist) * step;
                const ny = v.pos.y + (dy / dist) * step;

                let facing = v.facing;
                const shouldConsiderFacing = dist > FACING_DIST_EPS;
                if (shouldConsiderFacing) {
                    const desiredFacing = resolveFacing(dx, dy, v.facing);
                    const screenDx = (dx - dy);
                    const bigEnoughTurn = Math.abs(screenDx) >= FACING_SCREEN_EPS;
                    const canFlip = desiredFacing !== v.facing && st.nowMs - v.lastFacingMs >= FACING_COOLDOWN_MS && bigEnoughTurn;
                    if (canFlip) facing = desiredFacing;
                }

                nextVillager = {
                    ...v,
                    pos: { x: nx, y: ny },
                    facing,
                    lastFacingMs: facing !== v.facing ? st.nowMs : v.lastFacingMs
                };
                if (step > 0) changed = true;
            }
            // Close enough: stop to avoid back-forth jitter.
            else {
                // no-op
            }
        }

        // When a gatherer/woodcutter is at a resource, let them idle-wander slightly around it every few seconds.
        if (!target && st.flags.working && (v.job === "gatherer" || v.job === "woodcutter")) {
            const nearest = nearestHarvestable(stateWithBuildings, nextVillager.pos, v.job === "woodcutter" ? ["tree"] : ["berry_bush", "mushroom"]);
            if (nearest) {
                const dist = Math.hypot(nearest.pos.x - nextVillager.pos.x, nearest.pos.y - nextVillager.pos.y);
                if (dist <= HARVEST_RADIUS + 0.05) {
                    const wander = idleWander(nearest.pos, v.id, st.nowMs);
                    nextVillager = { ...nextVillager, pos: wander };
                    idleWanderApplied = true;
                    changed = true;
                }
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
    if (job === "gatherer" || job === "woodcutter") {
        // Skip instant harvest; building tasks handle output timing for gatherers/woodcutters.
        return { harvested: false, buildings, inventory, event: null };
    }
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

function idleWander(anchor: Vec2, villagerId: string, nowMs: number): Vec2 {
    const period = 5000 + (hashId(villagerId) % 5000); // 5-10s
    const t = (nowMs % period) / period;
    const angle = t * Math.PI * 2;
    const radius = 0.12;
    return {
        x: anchor.x + Math.cos(angle) * radius,
        y: anchor.y + Math.sin(angle) * radius * 0.75
    };
}

function hashId(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
