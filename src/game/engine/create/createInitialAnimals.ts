import { Animal } from "../../types/GameState";

export function createInitialAnimals(): Record<string, Animal> {
    const baseX = 34;
    const baseY = 32;

    const mk = (id: string, type: Animal["type"], x: number, y: number): Animal => ({
        id,
        type,
        pos: { x, y },
        state: "idle"
    });

    const animals: Animal[] = [
        mk("a1", "dog", baseX + 0, baseY + 0)
    ];

    return Object.fromEntries(animals.map(a => [a.id, a]));
}
