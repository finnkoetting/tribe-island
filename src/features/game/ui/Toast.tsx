import ui from "@/styles/ui.module.scss";

export default function Toast({ data }: { data: { t: string; m: string; on: boolean } }) {
    return (
        <div className={`${ui.toast} ${data.on ? ui.show : ""}`}>
            <div className={ui.toastTitle}>{data.t}</div>
            <div className={ui.toastMsg}>{data.m}</div>
        </div>
    );
}
