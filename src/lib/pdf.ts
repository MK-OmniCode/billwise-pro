import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtINR, fmtNum, amountInWords } from "./utils-bs";

export type CompanyInfo = {
  company_name: string;
  gstin?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  signature_label?: string | null;
};

export type PartySnap = {
  name?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  state?: string;
};

// Pure black & white professional theme
const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [40, 40, 40];
const GREY: [number, number, number] = [110, 110, 110];

function header(doc: jsPDF, company: CompanyInfo, title: string) {
  // Company name — large, bold, black
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  doc.text((company.company_name || "BS Dyeing").toUpperCase(), 14, 20);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  const lines: string[] = [];
  if (company.address) lines.push(company.address);
  const contact = [company.phone, company.email].filter(Boolean).join("  |  ");
  if (contact) lines.push(contact);
  if (company.gstin) lines.push(`GSTIN: ${company.gstin}`);
  doc.text(lines, 14, 26);

  // Title — right aligned, plain, no fill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(title.toUpperCase(), 196, 20, { align: "right" });

  // Double line separator (classic invoice look)
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(14, 42, 196, 42);
  doc.setLineWidth(0.2);
  doc.line(14, 43.5, 196, 43.5);
}

function metaAndParty(doc: jsPDF, party: PartySnap, leftLabel: string, leftVal: string, rightLabel: string, rightVal: string, startY: number) {
  // Two-column block: BILL TO (left) | meta (right)
  const y = startY;

  // Left: Party
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text("BILL TO", 14, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(party.name || "—", 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const partyLines: string[] = [];
  if (party.address) partyLines.push(...doc.splitTextToSize(party.address, 100));
  const sub = [party.phone, party.state].filter(Boolean).join("  |  ");
  if (sub) partyLines.push(sub);
  if (party.gstin) partyLines.push(`GSTIN: ${party.gstin}`);
  doc.text(partyLines, 14, y + 11);

  // Right: meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(leftLabel, 130, y);
  doc.text(rightLabel, 130, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(leftVal, 196, y, { align: "right" });
  doc.text(rightVal, 196, y + 7, { align: "right" });

  return y + Math.max(20, 11 + partyLines.length * 4);
}

function footer(doc: jsPDF, signatureLabel: string) {
  const pageH = doc.internal.pageSize.getHeight();
  // Signature line
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(140, pageH - 28, 196, pageH - 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(signatureLabel || "Authorised Signatory", 168, pageH - 23, { align: "center" });

  // Footer text
  doc.setDrawColor(...GREY);
  doc.setLineWidth(0.2);
  doc.line(14, pageH - 14, 196, pageH - 14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text("This is a computer generated document and does not require a physical signature.", 105, pageH - 9, { align: "center" });
}

// ============== CHALLAN ==============
export async function generateChallanPDF(opts: {
  company: CompanyInfo;
  challanNo: string;
  date: string;
  party: PartySnap;
  items: Array<{ description: string; quantity: number | string; remark?: string }>;
  remark?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Delivery Challan");

  const tableStart = metaAndParty(doc, opts.party, "Challan No.", opts.challanNo, "Date", opts.date, 52);

  autoTable(doc, {
    startY: tableStart + 4,
    head: [["S.No", "Description", "Quantity", "Remark"]],
    body: opts.items.map((it, i) => [
      String(i + 1),
      it.description || "",
      String(it.quantity ?? ""),
      it.remark || "",
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    bodyStyles: { lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 } as never },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: "auto" as never },
      2: { cellWidth: 32, halign: "right" },
      3: { cellWidth: 50 },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  if (opts.remark) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text("Remark:", 14, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(opts.remark, 180), 30, finalY + 10);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`Challan-${opts.challanNo}.pdf`);
}

// ============== BILL ==============
export async function generateBillPDF(opts: {
  company: CompanyInfo;
  billNo: string;
  date: string;
  party: PartySnap;
  items: Array<{ description: string; weight: number; rate: number; amount: number }>;
  subtotal: number;
  cgst_percent: number; sgst_percent: number; igst_percent: number;
  cgst_amount: number; sgst_amount: number; igst_amount: number;
  total: number;
  notes?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Tax Invoice");

  const tableStart = metaAndParty(doc, opts.party, "Invoice No.", opts.billNo, "Date", opts.date, 52);

  autoTable(doc, {
    startY: tableStart + 4,
    head: [["S.No", "Description", "Weight (kg)", "Rate (Rs/kg)", "Amount (Rs)"]],
    body: opts.items.map((it, i) => [
      String(i + 1),
      it.description || "",
      fmtNum(it.weight, 3),
      fmtNum(it.rate, 2),
      fmtNum(it.amount, 2),
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    bodyStyles: { lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 } as never },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: "auto" as never },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
    },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Totals — right-aligned, plain
  const labelX = 130, valX = 196;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);

  const rows: Array<[string, string]> = [["Subtotal", fmtINR(opts.subtotal)]];
  if (opts.cgst_percent > 0) rows.push([`CGST @ ${opts.cgst_percent}%`, fmtINR(opts.cgst_amount)]);
  if (opts.sgst_percent > 0) rows.push([`SGST @ ${opts.sgst_percent}%`, fmtINR(opts.sgst_amount)]);
  if (opts.igst_percent > 0) rows.push([`IGST @ ${opts.igst_percent}%`, fmtINR(opts.igst_amount)]);

  rows.forEach(([k, v]) => {
    doc.text(k, labelX, y);
    doc.text(v, valX, y, { align: "right" });
    y += 5.5;
  });

  // Grand total — bold with line above & below (no fill)
  y += 1;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(labelX, y - 3, valX, y - 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text("TOTAL", labelX, y + 2);
  doc.text(fmtINR(opts.total), valX, y + 2, { align: "right" });
  doc.setLineWidth(0.4);
  doc.line(labelX, y + 4, valX, y + 4);
  y += 12;

  // Amount in words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Amount in Words:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const words = doc.splitTextToSize(amountInWords(opts.total), 180);
  doc.text(words, 14, y + 5);
  y += 5 + words.length * 4 + 4;

  if (opts.notes) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(opts.notes, 180), 14, y + 5);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`Bill-${opts.billNo}.pdf`);
}

// ============== PAYMENT RECEIPT ==============
export async function generatePaymentReceiptPDF(opts: {
  company: CompanyInfo;
  date: string;
  partyName: string;
  amount: number;
  mode: string;
  reference?: string;
  notes?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Payment Receipt");

  const tableStart = metaAndParty(
    doc,
    { name: opts.partyName },
    "Date",
    opts.date,
    "Mode",
    (opts.mode || "").toUpperCase(),
    52,
  );

  let y = tableStart + 8;
  if (opts.reference) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text("Reference:", 14, y);
    doc.setTextColor(...BLACK);
    doc.text(opts.reference, 40, y);
    y += 8;
  }

  // Amount block — outlined
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.rect(14, y, 182, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("AMOUNT RECEIVED", 18, y + 10);
  doc.setFontSize(16);
  doc.text(fmtINR(opts.amount), 192, y + 10, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Amount in Words:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const words = doc.splitTextToSize(amountInWords(opts.amount), 180);
  doc.text(words, 14, y + 5);
  y += 5 + words.length * 4 + 4;

  if (opts.notes) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(opts.notes, 180), 14, y + 5);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`Receipt-${opts.partyName.replace(/\s+/g, "_")}-${opts.date}.pdf`);
}

// ============== SUMMARY: PAYMENTS RECEIVED ==============
export async function generatePaymentsSummaryPDF(opts: {
  company: CompanyInfo;
  rows: Array<{ payment_date: string; party_name: string; mode: string; reference?: string | null; amount: number }>;
  fromDate?: string;
  toDate?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Payments Received — Summary");

  const range = opts.fromDate || opts.toDate ? `${opts.fromDate || "—"}  to  ${opts.toDate || "—"}` : `All entries`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("Period:", 14, 52);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(range, 30, 52);

  const total = opts.rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  autoTable(doc, {
    startY: 58,
    head: [["S.No", "Date", "Party", "Mode", "Reference", "Amount (Rs)"]],
    body: opts.rows.map((r, i) => [
      String(i + 1),
      r.payment_date,
      r.party_name || "—",
      (r.mode || "").toUpperCase(),
      r.reference || "—",
      fmtNum(Number(r.amount), 2),
    ]),
    foot: [["", "", "", "", "TOTAL", fmtNum(total, 2)]],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    footStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    bodyStyles: { lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 } as never },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: "auto" as never },
      3: { cellWidth: 22 },
      4: { cellWidth: 38 },
      5: { cellWidth: 30, halign: "right" },
    },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Grand Total Received:", 14, y);
  doc.text(fmtINR(total), 196, y, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Amount in Words:", 14, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const words = doc.splitTextToSize(amountInWords(total), 180);
  doc.text(words, 14, y + 13);

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`Payments-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============== SUMMARY: BILLS GIVEN ==============
export async function generateBillsGivenSummaryPDF(opts: {
  company: CompanyInfo;
  rows: Array<{ given_date: string; bill_no: string; party_name: string; amount: number; notes?: string | null }>;
  fromDate?: string;
  toDate?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Bills Given — Summary");

  const range = opts.fromDate || opts.toDate ? `${opts.fromDate || "—"}  to  ${opts.toDate || "—"}` : `All entries`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("Period:", 14, 52);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(range, 30, 52);

  const total = opts.rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  autoTable(doc, {
    startY: 58,
    head: [["S.No", "Date", "Bill No", "Party", "Amount (Rs)"]],
    body: opts.rows.map((r, i) => [
      String(i + 1),
      r.given_date,
      r.bill_no || "—",
      r.party_name || "—",
      fmtNum(Number(r.amount), 2),
    ]),
    foot: [["", "", "", "TOTAL", fmtNum(total, 2)]],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: BLACK, lineColor: BLACK, lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    footStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: "bold", lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 } as never },
    bodyStyles: { lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 } as never },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: "auto" as never },
      4: { cellWidth: 32, halign: "right" },
    },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Grand Total Bills Given:", 14, y);
  doc.text(fmtINR(total), 196, y, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Amount in Words:", 14, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const words = doc.splitTextToSize(amountInWords(total), 180);
  doc.text(words, 14, y + 13);

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`BillsGiven-Summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============== BILL GIVEN (manual) ==============
export async function generateBillGivenPDF(opts: {
  company: CompanyInfo;
  date: string;
  billNo: string;
  partyName: string;
  amount: number;
  notes?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, opts.company, "Bill Given");

  const tableStart = metaAndParty(
    doc,
    { name: opts.partyName },
    "Bill No.",
    opts.billNo || "—",
    "Date",
    opts.date,
    52,
  );

  let y = tableStart + 8;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.rect(14, y, 182, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("BILL AMOUNT", 18, y + 10);
  doc.setFontSize(16);
  doc.text(fmtINR(opts.amount), 192, y + 10, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Amount in Words:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const words = doc.splitTextToSize(amountInWords(opts.amount), 180);
  doc.text(words, 14, y + 5);
  y += 5 + words.length * 4 + 4;

  if (opts.notes) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(opts.notes, 180), 14, y + 5);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`BillGiven-${opts.billNo || opts.partyName}-${opts.date}.pdf`);
}
