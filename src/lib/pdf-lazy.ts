// Lazy wrappers around src/lib/pdf.ts so jsPDF (~600KB) is only loaded
// when the user actually clicks a "download / save & PDF" button.
// This keeps initial route bundles fast.

import type * as PdfModule from "./pdf";

let modPromise: Promise<typeof PdfModule> | null = null;
function getMod() {
  if (!modPromise) modPromise = import("./pdf");
  return modPromise;
}

export async function generateBillPDF(args: Parameters<typeof PdfModule.generateBillPDF>[0]) {
  const m = await getMod();
  return m.generateBillPDF(args);
}
export async function generateChallanPDF(args: Parameters<typeof PdfModule.generateChallanPDF>[0]) {
  const m = await getMod();
  return m.generateChallanPDF(args);
}
export async function generatePaymentReceiptPDF(args: Parameters<typeof PdfModule.generatePaymentReceiptPDF>[0]) {
  const m = await getMod();
  return m.generatePaymentReceiptPDF(args);
}
export async function generateBillGivenPDF(args: Parameters<typeof PdfModule.generateBillGivenPDF>[0]) {
  const m = await getMod();
  return m.generateBillGivenPDF(args);
}
export async function generatePaymentsSummaryPDF(args: Parameters<typeof PdfModule.generatePaymentsSummaryPDF>[0]) {
  const m = await getMod();
  return m.generatePaymentsSummaryPDF(args);
}
export async function generateBillsGivenSummaryPDF(args: Parameters<typeof PdfModule.generateBillsGivenSummaryPDF>[0]) {
  const m = await getMod();
  return m.generateBillsGivenSummaryPDF(args);
}

// Optional: warm the chunk on hover so the first click is instant.
export function preloadPdf() { getMod(); }
