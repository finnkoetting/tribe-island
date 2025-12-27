import ui from "@/styles/ui.module.scss";
import type { GameState } from "../types";
import { villageStatus } from "../engine";

export default function Topbar({ st }: { st: GameState }) {
    const v = villageStatus(st);

    const dotCls =
        v.dot === "warn" ? ui.dotWarn : v.dot === "bad" ? ui.dotBad : ui.dot;

    return (
        <div className={ui.top}>
            <div className={ui.brand}>
                <div className={ui.logo} />
                <div>
                    <h1>Tribe Island</h1>
                    <div className={ui.sub}>Tribez-Style · Insel bauen · Ressourcen · Quests</div>
                </div>
            </div>

            <div className={ui.res}>
                <div className={ui.pill}>
                    <span className={dotCls} />
                    <span className={ui.k}>Dorf</span>
                    <span className={ui.v}>{v.t}</span>
                </div>

                <div className={ui.pill}><span className={ui.k}>🪵 Holz</span><span className={ui.v}>{Math.floor(st.res.wood)}</span></div>
                <div className={ui.pill}><span className={ui.k}>🌾 Food</span><span className={ui.v}>{Math.floor(st.res.food)}</span></div>
                <div className={ui.pill}>
                    <span className={ui.k}>👥 Pop</span><span className={ui.v}>{Math.floor(st.res.pop)}</span>
                    <span className={ui.k}>/</span><span className={ui.v}>{Math.floor(st.res.cap)}</span>
                </div>
                <div className={ui.pill}><span className={ui.k}>💎 Gems</span><span className={ui.v}>{Math.floor(st.res.gems)}</span></div>
            </div>
        </div>
    );
}
