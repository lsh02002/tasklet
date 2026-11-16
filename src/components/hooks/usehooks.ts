import { createContext, useContext } from "react";
import type { ModalManagerContextValue } from "./ModalManager";

export const ModalManagerContext =
  createContext<ModalManagerContextValue | null>(null);

export function useModalManager() {
  const context = useContext(ModalManagerContext);

  if (!context) {
    throw new Error("useModalManager must be used inside <ModalProvider>");
  }

  return context;
}
