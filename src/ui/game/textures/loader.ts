type LoaderFn = () => Promise<any>;

const manifest: Record<string, LoaderFn> = {
    "buildings/campfire/lvl1": () => import("./buildings/campfire/lvl1.png"),
    "buildings/campfire/lvl2": () => import("./buildings/campfire/lvl2.png"),
    "buildings/campfire/lvl3": () => import("./buildings/campfire/lvl3.png"),
    "buildings/gather_hut/lvl1": () => import("./buildings/gather_hut/lvl1.png"),
    "buildings/gather_hut/lvl2": () => import("./buildings/gather_hut/lvl2.png"),
    "buildings/gather_hut/lvl3": () => import("./buildings/gather_hut/lvl3.png"),
    "buildings/gather_hut/lvl4": () => import("./buildings/gather_hut/lvl4.png"),
    "objects/stone": () => import("./objects/stone.png"),
    "objects/stone/1": () => import("./objects/stone/1.png"),
    "objects/stone/2": () => import("./objects/stone/2.png"),
    "objects/stone/3": () => import("./objects/stone/3.png"),
    "objects/villager/female/1": () => import("./objects/villager/female/1.png"),
    "objects/villager/male/1": () => import("./objects/villager/male/1.png"),
    "objects/cow": () => import("./objects/animal/cow.png"),
    "objects/dog": () => import("./objects/animal/dog.png"),
    "objects/sheep": () => import("./objects/animal/sheep.png"),
    "objects/berrybush": () => import("./objects/berrybush.png"),
    "objects/mushroom": () => import("./objects/mushroom.png"),
    "objects/mushroom/1": () => import("./objects/mushroom/1.png"),
    "objects/mushroom/2": () => import("./objects/mushroom/2.png"),
    "objects/mushroom/3": () => import("./objects/mushroom/3.png"),
    "objects/tree": () => import("./objects/tree.png"),
    "objects/tree/1": () => import("./objects/tree/1.png"),
    "objects/tree/2": () => import("./objects/tree/2.png")
};

const bitmapCache: Partial<Record<string, Promise<ImageBitmap | null>>> = {};

async function toSrc(mod: any): Promise<string> {
    if (!mod) throw new Error("Invalid module");
    if (typeof mod === "string") return mod;
    // Next/image static import may expose an object on default: { src, height, width }
    if (mod.default) {
        if (typeof mod.default === "string") return mod.default;
        if (mod.default.src) return mod.default.src;
    }
    if (mod.src) return mod.src;
    throw new Error("Cannot resolve image src from module");
}

function loadImageBitmapFromSrc(src: string): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => createImageBitmap(img).then(resolve).catch(reject);
        img.onerror = () => reject(new Error(`Failed to load texture ${src}`));
    });
}

export async function getTextureBitmap(id: string): Promise<ImageBitmap | null> {
    if (bitmapCache[id]) return bitmapCache[id];

    const loader = manifest[id];
    if (!loader) return null;

    const p = (async () => {
        try {
            const mod = await loader();
            const src = await toSrc(mod);
            const bmp = await loadImageBitmapFromSrc(src);
            return bmp;
        } catch (err) {
            console.warn(`Failed to load texture ${id}`, err);
            return null;
        }
    })();

    bitmapCache[id] = p;
    return p;
}

export function preloadTextures(ids: string[]) {
    return Promise.all(ids.map((id) => getTextureBitmap(id)));
}

export function listAvailableTextures() {
    return Object.keys(manifest);
}
