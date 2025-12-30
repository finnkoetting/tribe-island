import React from "react";
import { MODAL_STYLE } from "../theme/modalStyleGuide";

export function ModalContainer({ children, onClose, title, headerAction }: { children: React.ReactNode; onClose: () => void; title: React.ReactNode; headerAction?: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(30, 20, 5, 0.65)",
      pointerEvents: "auto"
    }}>
      <div style={{
        ...MODAL_STYLE,
        minWidth: 380,
        maxWidth: 600,
        width: "96vw",
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
        gap: 18
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: MODAL_STYLE.headerFontWeight, fontSize: MODAL_STYLE.headerFontSize }}>{title}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {headerAction}
            <button
              onClick={onClose}
              style={{
                ...MODAL_STYLE.button,
                fontSize: 18,
                padding: "8px 18px",
                borderRadius: 12,
                background: "#ffe082",
                color: "#4b4327"
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
