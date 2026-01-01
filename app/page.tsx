import Link from "next/link";
import React from "react";

const cardShadow = "0 12px 24px rgba(0,0,0,0.18)";
const insetGlow = "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.25)";

export default function HomePage() {
	return (
		<main style={layout.shell}>
			<style>{"@import url('https://fonts.googleapis.com/css2?family=Signika:wght@600;700;800&display=swap');"}</style>
			<div style={layout.sky} />
			<div style={layout.sunsetGlow} />
			<div style={layout.ground} />

			<section style={layout.frame}>
				<header style={layout.topBar}>
					<div style={layout.brand}>Tribez</div>
					<div style={layout.clock}>Tag 3 · Abend · 18:40</div>
					<div style={layout.speedControls}>
						<button style={layout.speedBtn}>⏸ Pause</button>
						<button style={{ ...layout.speedBtn, background: "#2f6f4e" }}>▶️ Normal</button>
						<button style={layout.speedBtn}>⏩ Schnell</button>
					</div>
					<div style={layout.resources}>
						<Badge icon="🍗" label="2" />
						<Badge icon="😊" label="1" />
						<Badge icon="🪨" label="1" />
					</div>
				</header>

				<div style={layout.columns}>
					<Panel title="Dorf-Übersicht" style={{ minWidth: 220 }}>
						<StatRow label="Villager" value="5" />
						<StatRow label="Moral" value="😊 Stabil" />
						<Progress label="Nahrung" percent={75} tone="#8ac44d" />
						<StatRow label="Schlaf" value="2" />
					</Panel>

					<div style={layout.playfield}>
						<div style={layout.campfireCircle}>
							<div style={layout.campfireGlow}>
								<div style={layout.campfire}>🔥</div>
							</div>
							<div style={layout.collectPill}>Collect!</div>
						</div>
						<div style={layout.villagers}>
							<Character name="Vivi" mood="😊" sleeping />
							<Character name="Taru" mood="😊" />
						</div>
					</div>

					<Panel title="Heutiges Ziel" style={{ minWidth: 260 }}>
						<Objective title="Baue eine Brücke" progress={40} icon="🪵" />
						<div style={layout.objectiveList}>
							<Task checked label="Errichte ein Zuhause" />
							<Task label="Sichere die Nahrung" hint="0/1 Sammelhütte" />
							<Task label="Triff eine Entscheidung" hint="Forschung" />
						</div>
					</Panel>
				</div>

				<footer style={layout.bottomBar}>
					<div style={layout.tabRow}>
						<TabButton label="Bauen" active />
						<TabButton label="Villager" />
						<TabButton label="Forschung" />
						<TabButton label="Handel" icon="🐾" />
						<TabButton label="Karte" icon="🗺️" />
					</div>
					<div style={layout.cardRow}>
						<BuildCard label="Lagerfeuer" icon="🔥" selected />
						<BuildCard label="Sammelhütte" icon="🏚️" />
						<BuildCard label="Lager" icon="📦" locked />
						<BuildCard label="Wachtposten" icon="🏹" locked />
						<BuildCard label="?" icon="🔒" locked />
					</div>
				</footer>
			</section>

			<Link href="/game" style={layout.playCta}>
				Zum Prototyp
			</Link>
		</main>
	);
}

function Badge({ icon, label }: { icon: string; label: string }) {
	return (
		<div style={layout.badge}>
			<span style={{ fontSize: 18 }}>{icon}</span>
			<span style={{ fontWeight: 700 }}>{label}</span>
		</div>
	);
}

function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
	return (
		<div style={{ ...layout.panel, ...style }}>
			<div style={layout.panelTitle}>{title}</div>
			<div style={layout.panelBody}>{children}</div>
		</div>
	);
}

function StatRow({ label, value }: { label: string; value: string }) {
	return (
		<div style={layout.statRow}>
			<span style={{ opacity: 0.75 }}>{label}</span>
			<span style={{ fontWeight: 700 }}>{value}</span>
		</div>
	);
}

function Progress({ label, percent, tone }: { label: string; percent: number; tone: string }) {
	return (
		<div style={{ display: "grid", gap: 6 }}>
			<div style={{ opacity: 0.75 }}>{label}</div>
			<div style={layout.progressShell}>
				<div style={{ ...layout.progressFill, width: `${percent}%`, background: tone }} />
			</div>
		</div>
	);
}

function Objective({ title, progress, icon }: { title: string; progress: number; icon: string }) {
	return (
		<div style={layout.objectiveHeader}>
			<div style={layout.objectiveTitle}>
				<span style={{ fontSize: 18 }}>{icon}</span>
				<span>{title}</span>
			</div>
			<div style={layout.progressShellSmall}>
				<div style={{ ...layout.progressFillSmall, width: `${progress}%` }} />
			</div>
		</div>
	);
}

function Task({ label, hint, checked }: { label: string; hint?: string; checked?: boolean }) {
	return (
		<div style={layout.taskRow}>
			<span style={{ fontSize: 18 }}>{checked ? "✅" : "○"}</span>
			<div>
				<div style={{ fontWeight: 700 }}>{label}</div>
				{hint ? <div style={{ opacity: 0.7, fontSize: 12 }}>{hint}</div> : null}
			</div>
		</div>
	);
}

function Character({ name, mood, sleeping }: { name: string; mood: string; sleeping?: boolean }) {
	return (
		<div style={layout.characterChip}>
			<div style={{ fontSize: 22 }}>{mood}</div>
			<div style={{ fontWeight: 800 }}>{name}</div>
			{sleeping ? <div style={{ fontSize: 12, opacity: 0.7 }}>Zzz...</div> : <div style={{ fontSize: 12, opacity: 0.7 }}>Holz holen</div>}
		</div>
	);
}

function TabButton({ label, icon, active }: { label: string; icon?: string; active?: boolean }) {
	return (
		<button style={{ ...layout.tabBtn, ...(active ? layout.tabBtnActive : {}) }}>
			{icon ? <span style={{ fontSize: 15 }}>{icon}</span> : null}
			<span>{label}</span>
		</button>
	);
}

function BuildCard({ label, icon, selected, locked }: { label: string; icon: string; selected?: boolean; locked?: boolean }) {
	return (
		<div style={{ ...layout.buildCard, ...(selected ? layout.buildCardSelected : {}), ...(locked ? layout.buildCardLocked : {}) }}>
			<div style={layout.buildIcon}>{locked ? "🔒" : icon}</div>
			<div style={layout.buildLabel}>{label}</div>
		</div>
	);
}

const layout = {
		shell: {
			position: "relative",
			minHeight: "100vh",
			background: "linear-gradient(180deg, #1c2a33 0%, #1f2f3b 40%, #24363f 70%, #1f2b35 100%)",
			color: "#f5f1e7",
			overflow: "hidden",
			padding: "40px 32px 64px",
			fontFamily: "'Rubik', 'Signika', sans-serif"
		} as React.CSSProperties,
	sky: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "46vh",
		background: "radial-gradient(circle at 50% 10%, rgba(255,181,115,0.6), rgba(48,75,92,0.2) 50%, rgba(28,41,51,0.8) 80%)",
		pointerEvents: "none"
	} as React.CSSProperties,
	sunsetGlow: {
		position: "absolute",
		top: "22vh",
		left: "12%",
		width: 360,
		height: 360,
		background: "radial-gradient(circle, rgba(254,203,143,0.35) 0%, rgba(254,203,143,0) 70%)",
		filter: "blur(20px)",
		pointerEvents: "none"
	} as React.CSSProperties,
	ground: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: "54vh",
		background: "radial-gradient(circle at 40% 40%, #3d5435 0%, #2d3f33 55%, #1c252b 100%)",
		filter: "blur(2px)",
		pointerEvents: "none"
	} as React.CSSProperties,
	frame: {
		position: "relative",
		margin: "0 auto",
		maxWidth: 1160,
		borderRadius: 28,
		padding: "18px 18px 24px",
		background: "rgba(18,24,30,0.7)",
		boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
		border: "1px solid rgba(255,255,255,0.05)",
		backdropFilter: "blur(8px)"
	} as React.CSSProperties,
	topBar: {
		display: "grid",
		gridTemplateColumns: "auto 1fr auto auto",
		alignItems: "center",
		gap: 14,
		padding: "12px 16px",
		background: "linear-gradient(180deg, #394b59 0%, #293744 100%)",
		borderRadius: 18,
		boxShadow: cardShadow,
		border: "1px solid rgba(255,255,255,0.08)",
		textShadow: "0 1px 0 rgba(0,0,0,0.35)"
	} as React.CSSProperties,
	brand: {
		fontSize: 24,
		fontWeight: 800,
		letterSpacing: 1.2,
		color: "#f9d28e"
	} as React.CSSProperties,
	clock: {
		justifySelf: "center",
		fontWeight: 700,
		letterSpacing: 0.4,
		color: "#f4f0e5"
	} as React.CSSProperties,
	speedControls: {
		display: "flex",
		gap: 10
	} as React.CSSProperties,
	speedBtn: {
		background: "#22313f",
		border: "1px solid rgba(255,255,255,0.08)",
		color: "#f7f3ea",
		padding: "8px 12px",
		borderRadius: 12,
		fontWeight: 700,
		boxShadow: insetGlow
	} as React.CSSProperties,
	resources: {
		display: "flex",
		gap: 8,
		justifySelf: "end"
	} as React.CSSProperties,
	badge: {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		padding: "6px 10px",
		background: "rgba(0,0,0,0.35)",
		borderRadius: 12,
		border: "1px solid rgba(255,255,255,0.08)",
		boxShadow: insetGlow
	} as React.CSSProperties,
	columns: {
		display: "grid",
		gridTemplateColumns: "260px 1fr 320px",
		gap: 18,
		marginTop: 16,
		alignItems: "stretch"
	} as React.CSSProperties,
	panel: {
		background: "linear-gradient(180deg, #273541 0%, #202c35 100%)",
		borderRadius: 18,
		border: "1px solid rgba(255,255,255,0.08)",
		boxShadow: cardShadow,
		overflow: "hidden"
	} as React.CSSProperties,
	panelTitle: {
		padding: "12px 14px",
		background: "#1b252d",
		fontWeight: 800,
		letterSpacing: 0.6,
		textTransform: "uppercase",
		fontSize: 12,
		color: "#f8dba3",
		borderBottom: "1px solid rgba(255,255,255,0.08)"
	} as React.CSSProperties,
	panelBody: {
		padding: "14px 16px 16px",
		display: "grid",
		gap: 12
	} as React.CSSProperties,
	statRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "8px 10px",
		background: "rgba(0,0,0,0.2)",
		borderRadius: 12,
		border: "1px solid rgba(255,255,255,0.06)"
	} as React.CSSProperties,
	progressShell: {
		width: "100%",
		height: 12,
		borderRadius: 999,
		background: "rgba(255,255,255,0.08)",
		overflow: "hidden",
		border: "1px solid rgba(0,0,0,0.35)"
	} as React.CSSProperties,
	progressFill: {
		height: "100%",
		borderRadius: 999,
		boxShadow: "0 4px 10px rgba(0,0,0,0.25)"
	} as React.CSSProperties,
	progressShellSmall: {
		flex: 1,
		height: 12,
		borderRadius: 999,
		background: "rgba(255,255,255,0.08)",
		overflow: "hidden",
		border: "1px solid rgba(0,0,0,0.35)"
	} as React.CSSProperties,
	progressFillSmall: {
		height: "100%",
		background: "linear-gradient(90deg, #6ddf7c 0%, #44b969 100%)",
		boxShadow: "0 4px 10px rgba(0,0,0,0.25)"
	} as React.CSSProperties,
	objectiveHeader: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		padding: "10px 12px",
		background: "rgba(0,0,0,0.18)",
		borderRadius: 14,
		border: "1px solid rgba(255,255,255,0.06)"
	} as React.CSSProperties,
	objectiveTitle: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		fontWeight: 800
	} as React.CSSProperties,
	objectiveList: {
		display: "grid",
		gap: 10,
		marginTop: 8
	} as React.CSSProperties,
	taskRow: {
		display: "grid",
		gridTemplateColumns: "24px 1fr",
		alignItems: "center",
		gap: 8,
		padding: "10px 12px",
		background: "rgba(0,0,0,0.16)",
		borderRadius: 12,
		border: "1px solid rgba(255,255,255,0.05)"
	} as React.CSSProperties,
	playfield: {
		position: "relative",
		minHeight: 340,
		background: "radial-gradient(circle at 40% 30%, rgba(255,214,153,0.18), rgba(0,0,0,0.4) 60%)",
		borderRadius: 22,
		border: "1px solid rgba(255,255,255,0.06)",
		boxShadow: cardShadow,
		overflow: "hidden"
	} as React.CSSProperties,
	campfireCircle: {
		position: "absolute",
		left: "50%",
		top: "52%",
		transform: "translate(-50%, -50%)",
		display: "grid",
		placeItems: "center",
		gap: 6
	} as React.CSSProperties,
	campfireGlow: {
		width: 140,
		height: 140,
		borderRadius: "50%",
		background: "radial-gradient(circle, rgba(255,171,94,0.4) 0%, rgba(0,0,0,0) 70%)"
	} as React.CSSProperties,
	campfire: {
		fontSize: 46,
		filter: "drop-shadow(0 0 10px rgba(255,150,80,0.8))"
	} as React.CSSProperties,
	collectPill: {
		marginTop: -10,
		background: "#f5a524",
		color: "#2b1c0b",
		padding: "10px 18px",
		borderRadius: 999,
		fontWeight: 900,
		letterSpacing: 0.4,
		boxShadow: "0 10px 18px rgba(0,0,0,0.25), 0 0 0 2px rgba(0,0,0,0.2)",
		textTransform: "uppercase"
	} as React.CSSProperties,
	villagers: {
		position: "absolute",
		bottom: 28,
		left: 26,
		display: "flex",
		gap: 10
	} as React.CSSProperties,
	characterChip: {
		background: "rgba(0,0,0,0.35)",
		borderRadius: 12,
		padding: "10px 12px",
		border: "1px solid rgba(255,255,255,0.08)",
		boxShadow: insetGlow,
		minWidth: 96
	} as React.CSSProperties,
	bottomBar: {
		marginTop: 16,
		background: "linear-gradient(180deg, #2c3a45 0%, #202b33 100%)",
		borderRadius: 18,
		padding: "12px 14px 10px",
		border: "1px solid rgba(255,255,255,0.08)",
		boxShadow: cardShadow,
		display: "grid",
		gap: 10
	} as React.CSSProperties,
	tabRow: {
		display: "flex",
		gap: 10,
		flexWrap: "wrap"
	} as React.CSSProperties,
	tabBtn: {
		background: "rgba(0,0,0,0.25)",
		color: "#f4f0e5",
		border: "1px solid rgba(255,255,255,0.08)",
		padding: "8px 12px",
		borderRadius: 12,
		fontWeight: 800,
		boxShadow: insetGlow,
		display: "flex",
		alignItems: "center",
		gap: 6
	} as React.CSSProperties,
	tabBtnActive: {
		background: "#f5a524",
		color: "#2b1c0b",
		boxShadow: "0 6px 12px rgba(0,0,0,0.25)"
	} as React.CSSProperties,
	cardRow: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
		gap: 10
	} as React.CSSProperties,
	buildCard: {
		background: "linear-gradient(180deg, #364653 0%, #26343f 100%)",
		borderRadius: 14,
		padding: "10px 12px",
		border: "1px solid rgba(255,255,255,0.08)",
		boxShadow: insetGlow,
		display: "grid",
		gap: 6,
		justifyItems: "center",
		fontWeight: 800
	} as React.CSSProperties,
	buildCardSelected: {
		borderColor: "#f5a524",
		boxShadow: "0 8px 14px rgba(0,0,0,0.25), 0 0 0 2px rgba(245,165,36,0.4)"
	} as React.CSSProperties,
	buildCardLocked: {
		opacity: 0.5
	} as React.CSSProperties,
	buildIcon: {
		fontSize: 22
	} as React.CSSProperties,
	buildLabel: {
		fontSize: 14,
		textAlign: "center"
	} as React.CSSProperties,
	playCta: {
		position: "fixed",
		bottom: 20,
		right: 20,
		background: "#f5a524",
		color: "#2b1c0b",
		padding: "12px 16px",
		borderRadius: 14,
		fontWeight: 900,
		textDecoration: "none",
		boxShadow: "0 10px 18px rgba(0,0,0,0.25)",
		border: "1px solid rgba(0,0,0,0.2)"
	} as React.CSSProperties
};
