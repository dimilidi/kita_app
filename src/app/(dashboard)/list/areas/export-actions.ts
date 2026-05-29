"use server";

import { requireStaff } from "@/lib/actionAuth";
import { getPlayAreasExportSections } from "@/lib/playAreasExport";

/** Full export rows for print/PDF (no pagination); respects current list filters via URL params. */
export async function fetchPlayAreasExportSections(
  searchParams: Record<string, string | undefined>
) {
  if (!requireStaff()) {
    throw new Error("Forbidden");
  }
  return getPlayAreasExportSections(searchParams);
}
