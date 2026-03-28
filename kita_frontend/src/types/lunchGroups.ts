/** One lunch group for PDF/print: title = group name, table of children, educators, capacity. */
export type LunchGroupPdfSection = {
  groupName: string;
  capacity: number | null;
  children: { name: string; className: string }[];
  /** Sorted educator display names for this lunch group. */
  educatorNames: string[];
  /** Winning Tischspruch title (same vote logic as the lunch board), or null if none configured. */
  tischspruchTitle: string | null;
};
