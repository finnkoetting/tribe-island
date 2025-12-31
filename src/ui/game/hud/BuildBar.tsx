import React, { useState } from "react";
import type { FC } from "react";
import styles from "./BuildBar.module.css";
import { UI_THEME as THEME } from "../../theme";
import { BUILDING_COSTS } from "../../../game/domains/buildings/model/buildingCosts";

// Accept the same minimal shape as BUILD_SECTIONS from GameClient
type UiBuildItem = {
    id?: string;
    type?: string;
    title: string;
    cost?: string;
    size?: string;
};

type UiBuildSection = {
    id: string;
    title: string;
    items: UiBuildItem[];
};

const BuildBar: FC<{ sections: UiBuildSection[]; onSelect?: (type?: string) => void; isSelectable?: (type?: string) => boolean; open?: boolean }> = ({ sections, onSelect, isSelectable, open = true }) => {
    const [active, setActive] = useState(0);
    

    const filenameFor = (it: UiBuildItem) => {
        const key = it.type ?? it.id ?? "unknown";
        return `/assets/buildings/${key}.png`;
    };

    const resourceIcons: Record<string, FC<{ size?: number }>> = {
        wood: ({ size = 12 }) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="6" width="20" height="12" rx="2" fill="#b0753b" stroke="#8c5a2e" strokeWidth="0.8" />
            </svg>
        ),
        berries: ({ size = 12 }) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="8" cy="12" r="3" fill="#b85acb" />
                <circle cx="14" cy="9" r="2.2" fill="#b85acb" />
            </svg>
        ),
        stone: ({ size = 12 }) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 10 L8 6 L16 6 L20 10 L16 18 L8 18 Z" fill="#9ca3af" />
            </svg>
        ),
        fish: ({ size = 12 }) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 12c4-6 10-6 14-2s-2 6-6 6-8 2-8-4z" fill="#4cc3ff" />
            </svg>
        )
    };

    const [hovered, setHovered] = useState<number | null>(null);

    const hexToRgba = (hex: string, alpha: number) => {
        try {
            const h = hex.replace('#', '');
            const bigint = parseInt(h, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } catch (e) {
            return `rgba(0,0,0,${alpha})`;
        }
    };

    

    return (
        <div className={`${styles.wrapper} ${open ? styles.open : styles.closed}`} style={{ background: THEME.cardBg, border: `1px solid ${THEME.panelBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className={styles.tabs}>
                    {sections.map((s, i) => (
                        <button
                            key={s.id}
                            className={`${styles.tab} ${i === active ? styles.active : ""}`}
                            onClick={() => setActive(i)}
                        >
                            {s.title}
                        </button>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }} />
            </div>

            <div className={styles.items}>
                    {sections[active]?.items.map((it, idx) => {
                    const src = filenameFor(it);
                    const accent = sections[active]?.accent ?? THEME.accentButton;
                    const cardStyle: React.CSSProperties = {
                        border: '1px solid rgba(255,255,255,0.04)'
                    } as React.CSSProperties;
                    // expose accent color to CSS via variable for pseudo-element glow
                    (cardStyle as any)["--accent"] = accent;

                    const selectable = isSelectable ? isSelectable(it.type) : Boolean(it.type);

                    return (
                        <div
                            key={(it.id ?? it.type ?? idx)}
                            className={`${styles.itemCard} ${selectable ? styles.clickable : styles.disabled}`}
                            onMouseEnter={() => setHovered(idx)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => {
                                if (selectable && it.type) onSelect?.(it.type);
                            }}
                            title={!selectable ? "Nicht verfügbar" : undefined}
                            style={cardStyle}
                        >
                            <div className={styles.thumbWrap}>
                                <img
                                    src={src}
                                    alt={it.title}
                                    className={styles.thumb}
                                    onError={(e) => {
                                        const img = e.currentTarget as HTMLImageElement;
                                        const orig = img.getAttribute("src") || "";
                                        if (orig.endsWith(".png")) {
                                            img.src = orig.replace(/\.png$/, ".svg");
                                        } else {
                                            img.src = `/assets/ui/placeholders/building.svg`;
                                        }
                                    }}
                                />
                            </div>

                            <div className={styles.costBadge}>
                                {(() => {
                                    const type = it.type as string | undefined;
                                    const costObj = type ? BUILDING_COSTS[type] : undefined;
                                    if (costObj && Object.keys(costObj).length) {
                                        return (
                                            <div className={styles.costList}>
                                                {Object.entries(costObj).map(([res, amt]) => {
                                                    const Icon = resourceIcons[res] ?? (() => <span style={{width:12,height:12}}/>);
                                                    return (
                                                        <div key={res} className={styles.costItem}>
                                                            <Icon size={12} />
                                                            <span className={styles.costAmount}>{amt}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    // fallback to text if no structured cost available
                                    return <span>{it.cost ?? "—"}</span>;
                                })()}
                            </div>
                            {(it.status && it.status !== 'available') && (
                                <div className={`${styles.statusBadge} ${styles['status-' + (it.status ?? 'planned')]}`}>{it.status}</div>
                            )}

                            <div className={styles.titleRow}>
                                <div className={styles.title}>{it.title}</div>
                                <div className={styles.size}>({it.size ?? "—"})</div>
                            </div>

                            <div className={styles.midRight}>{/* mid-right info, e.g. count */}—</div>

                            <div className={styles.bottomRight}><span style={{marginRight:6}}>—</span><WoodIconSmall /></div>
                        </div>
                    );
                })}
            </div>

            {/* missing assets panel removed */}
        </div>
    );
};

export default BuildBar;

function WoodIconSmall() {
    return (
        <svg className={styles.resIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="6" width="14" height="8" rx="2" fill="#b0753b" stroke="#8c5a2e" strokeWidth="0.8" />
            <path d="M6 8.5h5" stroke="#d9b28c" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M7 11h3.5" stroke="#d9b28c" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
    );
}
