import React from "react";
import { ModalContainer } from "./ModalContainer";
import { MODAL_STYLE } from "../theme/modalStyleGuide";

export function AssignVillagerModal({ open, onClose, villagers, assigned, onAssign, onRemove }) {
  if (!open) return null;
  return (
    <ModalContainer onClose={onClose} title="Bewohner zuweisen">
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Zugewiesene Bewohner ({assigned.length})</div>
        <div style={{ display: "grid", gap: 10 }}>
          {assigned.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Keine Bewohner zugewiesen.</div>}
          {assigned.map(v => (
            <div key={v.id} style={{ ...MODAL_STYLE.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800 }}>{v.name}</span>
              <button style={{ ...MODAL_STYLE.button, minWidth: 90 }} onClick={() => onRemove(v.id)}>Entfernen</button>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 900, fontSize: 16, marginTop: 10 }}>Verfügbar</div>
        <div style={{ display: "grid", gap: 10 }}>
          {villagers.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Keine Bewohner verfügbar.</div>}
          {villagers.map(v => (
            <div key={v.id} style={{ ...MODAL_STYLE.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800 }}>{v.name}</span>
              <button style={{ ...MODAL_STYLE.button, minWidth: 90 }} onClick={() => onAssign(v.id)}>Zuweisen</button>
            </div>
          ))}
        </div>
      </div>
    </ModalContainer>
  );
}
