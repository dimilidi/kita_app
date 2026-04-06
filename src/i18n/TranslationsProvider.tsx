"use client";

import React, { createContext, useContext } from "react";

export type Dictionary = Record<string, any>;

const TranslationsContext = createContext<Dictionary | null>(null);

export function TranslationsProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <TranslationsContext.Provider value={dict}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  const ctx = useContext(TranslationsContext);
  if (!ctx) {
    throw new Error(
      "useTranslations must be used within a <TranslationsProvider />"
    );
  }
  return ctx;
}

