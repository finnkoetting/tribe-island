export type CameraState = { x: number; y: number; z: number };

const CAMERA_KEY = "tribe-island/camera/v1";

export function loadCamera(): CameraState | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CAMERA_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<CameraState>;
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number" && typeof parsed?.z === "number") {
            return { x: parsed.x, y: parsed.y, z: parsed.z };
        }
    } catch (err) {
        console.warn("Failed to load camera", err);
    }
    return null;
}

export function saveCamera(cam: CameraState): void {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(CAMERA_KEY, JSON.stringify(cam));
    } catch (err) {
        console.warn("Failed to save camera", err);
    }
}
