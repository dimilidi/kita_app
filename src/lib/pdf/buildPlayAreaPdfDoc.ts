/**
 * Builds a Play Areas PDF using the same layout pipeline as Lunch Groups export
 * (jspdf + autotable, per-section pages, logo, brand, footer totals, page numbers).
 */
import type { PlayAreaPdfSection } from "@/types/playAreas";

export type PlayAreaPdfLabels = {
  pdfBrandName: string;
  pdfSectionEducators: string;
  pdfSectionActivities: string;
  pdfSectionChildren: string;
  pdfColNum: string;
  pdfColChildName: string;
  pdfColGroup: string;
  pdfTotal: string;
  emptyState: string;
};

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch("/logo.jpg");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read logo image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Same bottom margin as Lunch Groups PDF so footer text clears comfortably. */
const PAGE_BOTTOM_MARGIN_PT = 56;

export async function buildPlayAreaPdfDocument(args: {
  sections: PlayAreaPdfSection[];
  lang: "en" | "de";
  labels: PlayAreaPdfLabels;
}) {
  const { sections, lang, labels } = args;

  const [jspdfMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const jsPDFConstructor =
    (jspdfMod as { jsPDF?: unknown; default?: unknown }).jsPDF ??
    (jspdfMod as { default?: unknown }).default;
  if (typeof jsPDFConstructor !== "function") {
    throw new Error("Could not load jsPDF constructor.");
  }

  const doc = new (jsPDFConstructor as any)({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const left = 40;
  const right = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - right;

  const dateStr = new Date().toLocaleDateString(
    lang === "de" ? "de-DE" : "en-GB",
    { dateStyle: "long" }
  );

  const autoTableMod = await import("jspdf-autotable");
  const autoTableFn = (autoTableMod as { default?: unknown }).default ?? autoTableMod;
  if (typeof autoTableFn !== "function") {
    throw new Error("autoTable is not available.");
  }

  const head = [[labels.pdfColNum, labels.pdfColChildName, labels.pdfColGroup]];

  const logoDataUrl = await fetchLogoDataUrl();

  const renderSectionPage = (sec: PlayAreaPdfSection) => {
    let y = 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(sec.areaName, left, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(dateStr, rightX, y, { align: "right" });

    y += 28;

    const logoW = 18;
    const logoH = 18;
    const brandY = y - 12;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", left, brandY, logoW, logoH);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(
      String(labels.pdfBrandName ?? "KitaKarlstraße"),
      logoDataUrl ? left + logoW + 8 : left,
      y
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    y += 22;

    /* Section: Educators */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(labels.pdfSectionEducators, left, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const eduText = sec.educatorNames.length
      ? sec.educatorNames.join(", ")
      : "—";
    const eduLines =
      doc.splitTextToSize(eduText, pageWidth - left - right) ?? [eduText];
    doc.text(eduLines, left, y);
    y += Math.max(14, eduLines.length * 12);

    y += 10;

    /* Section: Activities */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(labels.pdfSectionActivities, left, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const actText = sec.activityNames.length ? sec.activityNames.join(", ") : "—";
    const actLines =
      doc.splitTextToSize(actText, pageWidth - left - right) ?? [actText];
    doc.text(actLines, left, y);
    y += Math.max(14, actLines.length * 12);

    y += 10;

    /* Section: Children (table) */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(labels.pdfSectionChildren, left, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const body =
      sec.children.length > 0
        ? sec.children.map((c, idx) => [
            String(idx + 1),
            c.name,
            c.className,
          ])
        : [["—", "—", "—"]];

    autoTableFn(doc, {
      head,
      body,
      startY: y,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [55, 65, 81],
      },
      columnStyles: {
        0: { cellWidth: 44, halign: "center" },
        1: { cellWidth: 220 },
      },
      margin: { left, right, bottom: PAGE_BOTTOM_MARGIN_PT },
    });

    const finalY =
      (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
      y + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const capStr = sec.capacity != null ? String(sec.capacity) : "—";
    const childCount = sec.children.length;
    doc.text(
      `${labels.pdfTotal}: ${childCount} / ${capStr}`,
      left,
      finalY + 20
    );
  };

  if (sections.length === 0) {
    renderSectionPage({
      areaName: labels.emptyState,
      capacity: null,
      educatorNames: [],
      activityNames: [],
      children: [],
    });
  } else {
    let isFirstSection = true;
    for (const sec of sections) {
      if (!isFirstSection) {
        doc.addPage();
      }
      isFirstSection = false;
      renderSectionPage(sec);
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let pi = 1; pi <= totalPages; pi++) {
    doc.setPage(pi);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Page ${pi} / ${totalPages}`,
      left,
      doc.internal.pageSize.getHeight() - 24
    );
  }

  return { doc };
}
