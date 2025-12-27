import ui from "@/styles/ui.module.scss";
import type { GameState, Reward } from "../types";
import { QUESTS } from "../engine";

const rewardText = (r: Reward) => {
    const a: string[] = [];
    if (r.gems) a.push(`💎 ${r.gems}`);
    if (r.wood) a.push(`🪵 ${r.wood}`);
    if (r.food) a.push(`🌾 ${r.food}`);
    if (r.pop) a.push(`👥 ${r.pop}`);
    return a.join(" · ");
};

export default function QuestDrawer({ st, onClaim }: { st: GameState; onClaim: (id: string) => void }) {
    const total = QUESTS.length;
    const done = QUESTS.filter((q) => st.claimed[q.id]).length;

    return (
        <div className={ui.drawer}>
            <div className={ui.head}>
                <div className={ui.t}>
                    <div className={ui.title}>Quests</div>
                    <div className={ui.hint}>Ziele abschließen → Belohnung</div>
                </div>
                <div className={ui.tag}>{done}/{total}</div>
            </div>

            <div className={ui.body}>
                {QUESTS.map((q) => {
                    const ok = q.done(st);
                    const claimed = !!st.claimed[q.id];
                    const p = claimed ? 100 : ok ? 100 : q.progress(st);

                    return (
                        <div className={ui.quest} key={q.id}>
                            <div className={ui.top}>
                                <div className={ui.name}>{q.name}</div>
                                <button disabled={!ok || claimed} onClick={() => onClaim(q.id)}>
                                    {claimed ? "Erledigt" : "Einsammeln"}
                                </button>
                            </div>
                            <div className={ui.desc}>{q.desc}</div>
                            <div className={ui.prog}><i style={{ width: `${p}%` }} /></div>
                            <div className={ui.reward}>Belohnung: {rewardText(q.reward)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
