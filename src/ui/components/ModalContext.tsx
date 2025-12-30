"use client";

import React, { createContext, useContext, useState } from "react";

type ModalContextType = {
  activeId: string | null;
  requestOpen: (id: string) => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const requestOpen = (id: string) => {
    setActiveId(id);
  };

  return (
    <ModalContext.Provider value={{ activeId, requestOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModalContext must be used within ModalProvider");
  return ctx;
};

export default ModalContext;
