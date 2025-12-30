const SEED_KEY = "tribe-island/seed/v1";

export function loadSeed(): number | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(SEED_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function saveSeed(seed: number): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SEED_KEY, String(seed));
}

export function clearSeed(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(SEED_KEY);
}
