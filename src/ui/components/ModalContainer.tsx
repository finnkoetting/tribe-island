"use client";

import React, { useEffect, useRef, useState } from "react";
import { MODAL_STYLE } from "../theme/modalStyleGuide";
import { THEME } from "../theme";
import styles from "./Modal.module.css";
import { useModalContext } from "./ModalContext";

export function ModalContainer({ children, onClose, title, headerAction, modalId }: { children: React.ReactNode; onClose: () => void; title: React.ReactNode; headerAction?: React.ReactNode; modalId?: string }) {
  const [visible, setVisible] = useState(false);
  const { activeId, requestOpen } = useModalContext();
  const idRef = useRef<string>(modalId || `modal-${Math.random().toString(36).slice(2, 9)}`);
  const closedRef = useRef(false);

  useEffect(() => {
    requestOpen(idRef.current);
    const t = setTimeout(() => {
      if (activeId === idRef.current) setVisible(true);
    }, 10);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") initiateClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Become visible if we are the active modal
    if (activeId === idRef.current && !visible) {
      setVisible(true);
    }

    // If we were visible and are no longer the active modal, initiate close
    if (activeId !== idRef.current && visible) {
      initiateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const finishClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };

  const initiateClose = () => {
    setVisible(false);
    setTimeout(() => finishClose(), 220);
  };

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) initiateClose();
  };

  return (
    <div className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`} onClick={onOverlayClick} role="dialog" aria-modal="true">
      <div className={`${styles.modal} ${visible ? styles.modalVisible : ""}`} style={{
        ...MODAL_STYLE,
        background: `${MODAL_STYLE.background}, repeating-linear-gradient(135deg, rgba(255, 230, 188, 0.12) 0px, rgba(255, 230, 188, 0.12) 12px, rgba(120, 78, 38, 0.14) 12px, rgba(120, 78, 38, 0.14) 22px)` ,
        boxShadow: `${MODAL_STYLE.boxShadow}, inset 0 2px 0 rgba(255,255,255,0.18)` ,
        minWidth: 380,
        maxWidth: 600,
        width: "96vw",
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        overflow: "hidden"
      }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div style={{ fontWeight: MODAL_STYLE.headerFontWeight, fontSize: MODAL_STYLE.headerFontSize, textShadow: "0 2px 0 rgba(0,0,0,0.22)", letterSpacing: 0.2 }}>{title}</div>
          <div className={styles.actions}>
            {headerAction}
            <button
              onClick={initiateClose}
              className={styles.closeButton}
              style={{
                ...MODAL_STYLE.button,
                fontSize: 18,
                padding: "8px 18px",
                borderRadius: 14,
                background: THEME.button.hoverBackground,
                color: THEME.button.color,
                boxShadow: `${THEME.shadows.button}, inset 0 2px 0 rgba(255,255,255,0.35)`
              }}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ flex: 1 }} className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
