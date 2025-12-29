import { BuildingTypeId, Inventory, ResourceId } from "../../../types/GameState";

export type BuildingCost = Partial<Record<ResourceId, number>>;

export const BUILDING_COSTS: Record<BuildingTypeId, BuildingCost> = {
    townhall: { wood: 8, berries: 4 },
    campfire: { wood: 6 },
    gather_hut: { wood: 5 },
    storage: { wood: 6, berries: 2 },
    watchpost: { wood: 12, stone: 4 },
    road: { wood: 1 },
    rock: {},
    tree: {},
    berry_bush: {},
    mushroom: {}
};

const COST_ORDER: ResourceId[] = ["wood", "berries", "fish", "stone", "fibers", "planks", "medicine", "knowledge", "gold"];

export function formatCost(cost: BuildingCost): string {
    const parts = COST_ORDER
        .map(resource => {
            const amount = cost[resource];
            if (!amount) return null;
            const label =
                resource === "wood"
                    ? "Holz"
                    : resource === "berries"
                    ? "Beeren"
                    : resource === "fish"
                    ? "Fisch"
                    : resource === "stone"
                    ? "Stein"
                    : resource === "fibers"
                    ? "Fasern"
                    : resource === "planks"
                    ? "Bretter"
                    : resource === "medicine"
                    ? "Medizin"
                    : resource === "knowledge"
                    ? "Wissen"
                    : "Gold";
            return `${amount} ${label}`;
        })
        .filter(Boolean);

    return parts.length ? parts.join(", ") : "Keine Kosten";
}

export function canAffordCost(inventory: Inventory, cost: BuildingCost): boolean {
    return Object.entries(cost).every(([resource, amount]) => {
        if (!amount || amount <= 0) return true;
        const current = inventory[resource as ResourceId] ?? 0;
        return current >= amount;
    });
}

export function payCost(inventory: Inventory, cost: BuildingCost): Inventory {
    const next: Inventory = { ...inventory };

    for (const [resource, amount] of Object.entries(cost)) {
        if (!amount || amount <= 0) continue;
        const key = resource as ResourceId;
        next[key] = Math.max(0, (next[key] ?? 0) - amount);
    }

    return next;
}
