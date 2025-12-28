import { notFound } from "next/navigation";
import DebugClient from "./DebugClient";

export default function DebugPage() {
    const on = String(process.env.NEXT_PUBLIC_DEV_MODE || "").toLowerCase();
    const enabled = on === "1" || on === "true" || on === "yes";

    if (!enabled) notFound();

    return <DebugClient />;
}
