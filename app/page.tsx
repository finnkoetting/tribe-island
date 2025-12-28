import Link from "next/link";

export default function HomePage() {
	return (
		<main style={{ padding: "32px", fontFamily: "system-ui, sans-serif" }}>
			<h1 style={{ margin: 0 }}>Tribez Prototype</h1>
			<p style={{ marginTop: 12 }}>Starte das Spiel unter /game.</p>
			<Link
				href="/game"
				style={{
					display: "inline-block",
					marginTop: 12,
					padding: "10px 14px",
					borderRadius: 12,
					border: "1px solid rgba(0,0,0,0.14)",
					textDecoration: "none",
					color: "#0f172a",
					background: "white"
				}}
			>
				Weiter zum Spiel
			</Link>
		</main>
	);
}
