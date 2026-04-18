/** One play area (zone) for PDF/print export — mirrors lunch group PDF sections. */
export type PlayAreaPdfSection = {
  areaName: string;
  capacity: number | null;
  educatorNames: string[];
  /** Catalog `Activity` names + scheduled `Lesson` titles in the zone, deduped and sorted. */
  activityNames: string[];
  children: { name: string; className: string }[];
};
