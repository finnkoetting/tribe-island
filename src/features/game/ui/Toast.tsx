import ui from "@/styles/ui.module.scss";

export default function Toast({ data }: { data: { t: string; m: string; on: boolean } }) {
  return (
    <div className={`${ui.toast} ${data.on ? ui.show : ""}`}>
      <div className={ui.t}>{data.t}</div>
      <div className={ui.m}>{data.m}</div>
    </div>
  );
}
