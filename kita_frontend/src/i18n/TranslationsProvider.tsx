"use client";

import React, { createContext, useContext } from "react";
import type de from "@/locales/de.json";

export type Dictionary = typeof de;

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

