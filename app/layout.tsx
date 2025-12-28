import type { ReactNode } from "react";
import { Nunito } from "next/font/google";

const font = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="de">
            <body
                className={font.className}
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    background:
                        "radial-gradient(circle at 20% 20%, #f8f3e8 0%, #f0e6d6 40%, #e6ddcc 70%, #e0d6c3 100%)",
                    color: "#1f2933",
                    lineHeight: 1.5,
                    fontSize: 15,
                    WebkitFontSmoothing: "antialiased"
                }}
            >
                <style>{`
                    * { box-sizing: border-box; }
                    a { color: inherit; }
                    button { font-family: inherit; }
                `}</style>
                {children}
            </body>
        </html>
    );
}
