import Link from "next/link";

export default function HomePage() {
	return (
		<main
			style={{
				padding: "48px 56px",
				display: "grid",
				gap: 16,
				maxWidth: 720,
				color: "#1f2933"
			}}
		>
			<div style={{ display: "grid", gap: 8 }}>
				<div style={{ fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.7 }}>
					Cozy Survival Prototype
				</div>
				<h1 style={{ margin: 0, fontSize: 36, letterSpacing: -0.5 }}>Tribe Island</h1>
				<p style={{ margin: 0, maxWidth: 520, opacity: 0.8 }}>
					Simpel wie The Bonfire, freundlich wie The Tribez. Steuere deine Siedlung manuell, halte sie warm
					und sicher – keine Idle-Automation, aber immer Hoffnung.
				</p>
			</div>

			<div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
				<Link
					href="/game"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 10,
						padding: "12px 16px",
						borderRadius: 14,
						border: "1px solid #2f6f4e",
						background: "#2f6f4e",
						color: "white",
						textDecoration: "none",
						fontWeight: 700,
						boxShadow: "0 10px 20px rgba(47,111,78,0.18)",
						transition: "transform 120ms ease, box-shadow 120ms ease"
					}}
				>
					Spielen
				</Link>

				<div style={{ fontSize: 13, opacity: 0.75 }}>Ein Browser-Prototyp. Speichere lokal, keine FOMO.</div>
			</div>
		</main>
	);
}
