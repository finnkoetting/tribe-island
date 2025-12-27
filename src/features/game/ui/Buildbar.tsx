import ui from "@/styles/ui.module.scss";
import type { BuildingKey, GameState } from "../types";
import { BUILDINGS } from "../engine";
import { canPay } from "../engine/actions";

const costText = (k: BuildingKey) => {
    const c = BUILDINGS[k].cost;
    const a: string[] = [];
    if (c.wood) a.push(`🪵 ${c.wood}`);
    if (c.food) a.push(`🌾 ${c.food}`);
    if (c.gems) a.push(`💎 ${c.gems}`);
    return a.length ? a.join(" ") : "Free";
};

export default function Buildbar({
    st,
    order,
    onSelect,
    onSave,
    onReset
}: {
    st: GameState;
    order: BuildingKey[];
    onSelect: (k: BuildingKey) => void;
    onSave: () => void;
    onReset: () => void;
}) {
    return (
        <div className={ui.bottomBar}>
            {order.map((k) => {
                const d = BUILDINGS[k];
                const active = st.sel === k;
                const afford = canPay(st, k);

                return (
                    <div
                        key={k}
                        className={`${ui.slot} ${active ? ui.active : ""}`}
                        onClick={() => onSelect(k)}
                        style={{ opacity: afford ? 1 : 0.55 }}
                    >
                        <div className={ui.l}>
                            <div className={ui.ico}>{d.icon}</div>
                            <div>
                                <div className={ui.name}>{d.name}</div>
                                <div className={ui.meta}>{costText(k)} · ⏱ {d.time}s</div>
                            </div>
                        </div>
                        <div className={ui.tag}>
                            {d.vibe === "prod" ? "Produktion" : d.vibe === "home" ? "Wohnen" : "Support"}
                        </div>
                    </div>
                );
            })}

            <div className={ui.actions}>
                <button onClick={onSave}>Save</button>
                <button onClick={onReset}>Reset</button>
            </div>
        </div>
    );
}
