import { BUILDING_COSTS, formatCost } from "../../src/game/domains/buildings/model/buildingCosts";
import type { BuildingTypeId, GameState, QuestId, ResourceId } from "../../src/game/types/GameState";

export type BuildItem = {
    id: string;
    title: string;
    size: string;
    effect: string;
    upgrade: string;
    status: "available" | "locked" | "planned";
    type?: string | BuildingTypeId;
    cost?: string;
};

export type BuildSection = {
    id: string;
    title: string;
    focus: string;
    accent: string;
    items: BuildItem[];
};

export const BUILD_SECTIONS: BuildSection[] = [
  {
    id: "stage1",
    title: "Start",
    focus: "Grundsteuerung & Überleben",
    accent: "#ff914d",
    items: [
            {
                id: "townhall",
                type: "townhall",
                title: "Rathaus",
                size: "3x3",
                effect: "Dorfzentrum, Job-Zuweisung, Quest-Trigger",
                upgrade: "Mehr Villager-Slots, neue Menues",
                status: "available",
                cost: "12 Holz, 6 Beeren"
            },
            {
                id: "gather_hut",
                type: "gather_hut",
                title: "Sammlerhuette",
                size: "2x2",
                effect: "Nahrung herstellen",
                upgrade: "+Slots, bessere Tools",
                status: "available",
                cost: "8 Holz"
            },
            {
                id: "campfire",
                type: "campfire",
                title: "Lagerfeuer",
                size: "2x2",
                effect: "Moral-Stabilisator, Nacht-Sicherheit",
                upgrade: "Groessere Moral-Aura",
                status: "available",
                cost: "4 Holz"
            },
            {
                id: "sleep_hut",
                type: "sleep_hut",
                title: "Schlafhuette",
                size: "2x2",
                effect: "Regeneration, senkt Erschoepfung",
                upgrade: "Mehr Betten",
                status: "available",
                cost: "10 Holz"
            },
            {
                id: "path",
                type: "road",
                title: "Weg",
                size: "1x1",
                effect: "Verbinde Gebaeude",
                upgrade: "Schneller laufen",
                status: "available",
                cost: "1 Holz"
            }
    ]
  },
  {
    id: "stage2",
    title: "Versorgung",
    focus: "Nahrung & Stabilitaet",
    accent: "#fbbf24",
    items: [
            {
                id: "storage_small",
                type: "storage",
                title: "Lager",
                size: "2x2",
                effect: "Erhoeht Lagerkapazitaet",
                upgrade: "Richtung Grosses Lager",
                status: "available",
                cost: "10 Holz, 6 Stein"
            },
      {
        id: "well",
        type: "well",
        title: "Brunnen",
        size: "1x1",
        effect: "Krankheit runter, Moral leicht rauf",
        upgrade: "Staerkere Effekte",
        status: "planned"
      },
      {
        id: "woodcutter",
        type: "woodcutter",
        title: "Holzfaeller",
        size: "2x2",
        effect: "Holzproduktion",
        upgrade: "Effizientere Arbeit",
        status: "planned"
      }
    ]
  },
  {
    id: "stage3",
    title: "Sicherheit",
    focus: "Schutz & Vorbereitung",
    accent: "#22c55e",
    items: [
            {
                id: "watchpost",
                type: "watchpost",
                title: "Wache",
                size: "2x2",
                effect: "Angriffsschaden runter",
                upgrade: "Sichtweite rauf",
                status: "available",
                cost: "18 Holz, 6 Stein"
            }
    ]
  },
  {
    id: "stage4",
    title: "Handwerk",
    focus: "Verarbeitung & Effizienz",
    accent: "#3b82f6",
    items: [
      {
        id: "sawmill",
        type: "sawmill",
        title: "Saegewerk",
        size: "3x2",
        effect: "Wandelt Holz in Bretter",
        upgrade: "Schnellerer Zuschnitt",
        status: "available"
      },
      {
        id: "workbench",
        type: "workbench",
        title: "Werkbank",
        size: "2x2",
        effect: "Werkzeuge Stufe I",
        upgrade: "Stufe II/III",
        status: "planned"
      },
      {
        id: "drying_rack",
        type: "drying_rack",
        title: "Trockner",
        size: "2x1",
        effect: "Nahrung haltbarer",
        upgrade: "Geringerer Verderb",
        status: "planned"
      }
    ]
  },
  {
    id: "stage5",
    title: "Rohstoffe",
    focus: "Stein & Metall",
    accent: "#a855f7",
    items: [
      {
        id: "quarry",
        type: "quarry",
        title: "Steinbruch",
        size: "3x3",
        effect: "Steinproduktion",
        upgrade: "Erz-Chance",
        status: "planned"
      },
      {
        id: "mine",
        type: "mine",
        title: "Mine",
        size: "3x3",
        effect: "Kupfer/Eisen",
        upgrade: "Tiefer graben",
        status: "planned"
      }
    ]
  },
  {
    id: "stage6",
    title: "Verteidigung",
    focus: "Aktiver Schutz",
    accent: "#ef4444",
    items: [
      {
        id: "forge",
        type: "forge",
        title: "Schmiede",
        size: "3x3",
        effect: "Metallwerkzeuge, Waffen",
        upgrade: "Qualitaet rauf",
        status: "planned"
      },
      {
        id: "watchtower",
        type: "watchtower",
        title: "Turm",
        size: "2x3",
        effect: "Angriffe frueh erkennen",
        upgrade: "Fernschaden",
        status: "planned"
      },
      {
        id: "gate_wall",
        type: "gate_wall",
        title: "Palisade",
        size: "Variabel",
        effect: "Dorf verteidigen",
        upgrade: "Stein zu Metall",
        status: "planned"
      }
    ]
  },
  {
    id: "stage7",
    title: "Handel",
    focus: "Karawanen & Austausch",
    accent: "#14b8a6",
    items: [
      {
        id: "market",
        type: "market",
        title: "Markt",
        size: "4x4",
        effect: "Karawanen-Handel",
        upgrade: "Bessere Angebote",
        status: "planned"
      },
      {
        id: "caravan_yard",
        type: "caravan_yard",
        title: "Karawane",
        size: "4x3",
        effect: "Haefigere Haendler",
        upgrade: "Exklusive Waren",
        status: "planned"
      },
      {
        id: "harbor",
        type: "harbor",
        title: "Hafen",
        size: "4x3",
        effect: "Neue Karten / Welt",
        upgrade: "Schiffe",
        status: "planned"
      }
    ]
  },
  {
    id: "stage8",
    title: "Wissen",
    focus: "Forschung & Spezialisierung",
    accent: "#0ea5e9",
    items: [
      {
        id: "academy",
        type: "academy",
        title: "Akademie",
        size: "3x3",
        effect: "Forschung beschleunigen",
        upgrade: "Pfad-Spezialisierung",
        status: "planned"
      },
      {
        id: "archive",
        type: "archive",
        title: "Archiv",
        size: "3x2",
        effect: "Wissen speichern",
        upgrade: "Tech-Kosten runter",
        status: "planned"
      },
      {
        id: "observatory",
        type: "observatory",
        title: "Observatorium",
        size: "3x3",
        effect: "Events vorhersagen",
        upgrade: "Praezision",
        status: "planned"
      },
      {
        id: "research_tent",
        type: "research_tent",
        title: "Forschung",
        size: "2x2",
        effect: "Erste Techs",
        upgrade: "Richtung Forschungsgebaeude",
        status: "planned"
      }
    ]
  },
  {
    id: "stage9",
    title: "Kultur",
    focus: "Moral, Ruf, Events",
    accent: "#f97316",
    items: [
      {
        id: "tavern",
        type: "tavern",
        title: "Taverne",
        size: "3x3",
        effect: "Moral hoch, Konflikte runter",
        upgrade: "Produktivitaetsbonus",
        status: "planned"
      },
      {
        id: "temple",
        type: "temple",
        title: "Tempel",
        size: "4x4",
        effect: "Globale Moral, Ruf",
        upgrade: "Seltene Events",
        status: "planned"
      },
      {
        id: "memorial",
        type: "memorial",
        title: "Gedenken",
        size: "2x2",
        effect: "Trauer-Malus runter",
        upgrade: "Buffs aus Erinnerungen",
        status: "planned"
      },
      {
        id: "ritual_ground",
        type: "ritual_ground",
        title: "Ritual",
        size: "3x3",
        effect: "Risiko-Events mit Chance",
        upgrade: "Kontrolle rauf",
        status: "planned"
      },
      {
        id: "meeting_ground",
        type: "meeting_ground",
        title: "Platz",
        size: "3x3",
        effect: "Moral-Boost bei Events",
        upgrade: "Buff-Dauer rauf",
        status: "planned"
      }
    ]
  },
  {
    id: "stage10",
    title: "Prestige",
    focus: "Endgame & Meta",
    accent: "#111827",
    items: [
      {
        id: "outpost",
        type: "outpost",
        title: "Aussenposten",
        size: "3x3",
        effect: "Ressourcen remote",
        upgrade: "Automatisierung",
        status: "planned"
      },
      {
        id: "guildhall",
        type: "guildhall",
        title: "Gilde",
        size: "3x3",
        effect: "Quests & Ruf",
        upgrade: "Auftragswahl",
        status: "planned"
      },
      {
        id: "monument",
        type: "monument",
        title: "Monument",
        size: "4x4",
        effect: "Prestige-Bau",
        upgrade: "Stadtbonus",
        status: "planned"
      },
      {
        id: "bridge",
        type: "bridge",
        title: "Bruecke",
        size: "Variabel",
        effect: "Neue Biome",
        upgrade: "Stabilitaet",
        status: "planned"
      },
      {
        id: "lighthouse",
        type: "lighthouse",
        title: "Leuchtturm",
        size: "2x2",
        effect: "Karawanen-Sicht",
        upgrade: "Signalweite",
        status: "planned"
      }
    ]
  }
];

export const TUTORIAL_STEPS: Array<{ id: QuestId; description: string; target?: BuildingTypeId; hint?: string }> = [
    {
        id: "tutorial_home",
        description: "Richte ein Rathaus (3x3) ein. Es dient als Zentrum fuer Jobs und Auswahl.",
        target: "townhall",
        hint: "Waehle im Baumenue das Rathaus und platziere es auf freiem Boden."
    },
    {
        id: "tutorial_food",
        description: "Baue ein Lagerfeuer fuer Moral und erste Nachtruhe.",
        target: "campfire",
        hint: "Kosten im Blick behalten und nahe beim Rathaus platzieren."
    },
    {
        id: "tutorial_research",
        description: "Errichte eine Sammlerhuette, damit du regelmaessig Beeren bekommst.",
        target: "gather_hut",
        hint: "Nach dem Bau mindestens einen Bewohner zuweisen."
    }
];

export function isTutorialBuildLocked(type: BuildingTypeId | null, quests?: GameState["quests"]): boolean {
    if (!type || !quests) return false;
    const step = TUTORIAL_STEPS.find(s => s.target === type);
    if (!step) return false;
    return quests[step.id]?.locked ?? false;
}

export function getActiveTutorialId(quests?: GameState["quests"]): QuestId | null {
    if (!quests) return null;
    const next = TUTORIAL_STEPS.find(step => {
        const q = quests[step.id];
        return q && !q.done;
    });
    return next ? next.id : null;
}

export const BUILDABLE_ITEMS = BUILD_SECTIONS.flatMap(section => section.items).filter((item): item is BuildItem & { type: BuildingTypeId } => item.status === "available" && Boolean(item.type));
export const BUILDABLE_TYPE_SET = new Set<BuildingTypeId>(BUILDABLE_ITEMS.map(item => item.type));
export const BUILD_META: Record<BuildingTypeId, { title: string; cost: string; size: string; effect: string }> = BUILDABLE_ITEMS.reduce(
    (acc, item) => {
        acc[item.type] = {
            title: item.title,
            cost: formatCost(BUILDING_COSTS[item.type]),
            size: item.size,
            effect: item.effect
        };
        return acc;
    },
    {} as Record<BuildingTypeId, { title: string; cost: string; size: string; effect: string }>
);

export const RESOURCE_LABELS: Record<string, string> = {
    wood: "Holz",
    planks: "Bretter",
    berries: "Beeren",
    fish: "Fisch",
    stone: "Stein",
    fibers: "Fasern",
    medicine: "Medizin",
    knowledge: "Wissen",
    gold: "Gold",
    emerald: "Smaragde",
    mushrooms: "Pilze",
    wheat: "Weizen",
    rope: "Seile"
};

export function prettifyResource(id: string) {
    if (id === "mushrooms") return "Pilze";
    if (id === "wheat") return "Weizen";
    if (id === "rope") return "Seile";
    return id.replace(/_/g, " ");
}

export const resourceProducers: Partial<Record<string, string[]>> = {
    wood: ["tree", "sawmill"],
    berries: ["berry_bush", "gather_hut"],
    mushrooms: ["mushroom", "gather_hut"],
    planks: ["sawmill"]
};

export function producerTitle(type: string) {
    if ((BUILD_META as any)[type]) return (BUILD_META as any)[type].title;
    if (type === "tree") return "Baum (kann gefällt werden)";
    if (type === "berry_bush") return "Beerenbusch (wild)";
    if (type === "mushroom") return "Pilzstelle (wild)";
    return type;
}
