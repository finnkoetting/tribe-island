import type { FC } from "react";

const WoodIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="14" height="8" rx="2" fill="#b0753b" stroke="#8c5a2e" strokeWidth="1.2" />
        <path d="M6 8.5h5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 11h3.5" stroke="#d9b28c" strokeWidth="1" strokeLinecap="round" />
        <circle cx="13.5" cy="10" r="0.9" fill="#d9b28c" />
    </svg>
);

const BerriesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
        <circle cx="12" cy="11" r="3" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
        <circle cx="7" cy="12" r="2.4" fill="#c084fc" stroke="#a855f7" strokeWidth="1.1" />
        <path d="M10 7l3-3" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

const FishIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M5 10c2.2-3 5.8-3.8 9-2.2l2-1.3v7L14 12.2C10.8 13.8 7.2 13 5 10Z"
            fill="#67e8f9"
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
        <circle cx="12.5" cy="9.5" r="0.7" fill="#0f172a" />
    </svg>
);

const StoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M5.5 6.5 11 4.5l3.8 2.5.7 5.2-2.7 2.5H7.2L4.5 12l1-4.6Z"
            fill="#d1d5db"
            stroke="#6b7280"
            strokeWidth="1.1"
            strokeLinejoin="round"
        />
    </svg>
);

const FibersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7 15c0-5 1.5-7 3-10" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10 15c0-5 1.2-7.5 2.8-10.5" stroke="#34d399" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M12.5 15c0-4.5-.5-7 1-10" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

const MedicineIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4.5" y="4.5" width="11" height="11" rx="2.5" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
        <path d="M10 7v6M7 10h6" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);

const KnowledgeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M6 6h7c1.1 0 2 .9 2 2v7l-2-.8-2 .8-2-.8-2 .8V8c0-1.1.9-2 2-2Z"
            fill="#fcd34d"
            stroke="#b45309"
            strokeWidth="1.1"
            strokeLinejoin="round"
        />
        <path d="M8 8h5" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
        <path d="M8 10h3" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

const GoldIcon = () => (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="6" fill="#fbbf24" stroke="#c27803" strokeWidth="1.2" />
        <path d="M8 10.5c1.5.8 2.8.8 4 0M8 8.5c1.5-.8 2.8-.8 4 0" stroke="#92400e" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
);

const EmeraldIcon = () => (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <polygon points="10,4 15,8 12.5,15 7.5,15 5,8" fill="#10b981" stroke="#065f46" strokeWidth="0.9" />
        <path d="M10 6.5 L13 8.5" stroke="#064e3b" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
);

export const RES_ORDER: Array<{ id: string; label: string; Icon: FC; color: string }> = [
    { id: "wood", label: "Holz", Icon: WoodIcon as FC, color: "#d4a373" },
    { id: "planks", label: "Bretter", Icon: WoodIcon as FC, color: "#c8a46b" },
    { id: "berries", label: "Beeren", Icon: BerriesIcon as FC, color: "#b85acb" },
    { id: "fish", label: "Fisch", Icon: FishIcon as FC, color: "#4cc3ff" },
    { id: "stone", label: "Stein", Icon: StoneIcon as FC, color: "#9ca3af" },
    { id: "fibers", label: "Fasern", Icon: FibersIcon as FC, color: "#6ee7b7" },
    { id: "medicine", label: "Medizin", Icon: MedicineIcon as FC, color: "#f472b6" },
    { id: "knowledge", label: "Wissen", Icon: KnowledgeIcon as FC, color: "#fbbf24" },
    { id: "gold", label: "Gold", Icon: GoldIcon as FC, color: "#f59e0b" },
    { id: "emerald", label: "Smaragde", Icon: EmeraldIcon as FC, color: "#10b981" }
];

export { WoodIcon, BerriesIcon, FishIcon, StoneIcon, FibersIcon, MedicineIcon, KnowledgeIcon, GoldIcon, EmeraldIcon };
