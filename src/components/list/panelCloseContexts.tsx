"use client";

import { createContext, useContext } from "react";

export const FilterPanelCloseContext = createContext<(() => void) | null>(null);
export const SortPanelCloseContext = createContext<(() => void) | null>(null);

export function useOptionalFilterPanelClose() {
  return useContext(FilterPanelCloseContext);
}

export function useOptionalSortPanelClose() {
  return useContext(SortPanelCloseContext);
}
