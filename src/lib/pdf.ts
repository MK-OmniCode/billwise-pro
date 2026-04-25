import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtINR, fmtNum, amountInWords } from "./utils-bs";
import logoUrl from "@/assets/logo.png";

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

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

const NAVY: [number, number, number] = [40, 45, 90];
const GOLD: [number, number, number] = [196, 159, 76];
const MUTED: [number, number, number] = [100, 105, 130];

async function header(doc: jsPDF, company: CompanyInfo, title: string) {
  const logo = await loadLogo();
  if (logo) {
    try { doc.addImage(logo, "PNG", 14, 12, 22, 22); } catch { /* ignore */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(company.company_name || "BS Dyeing", 40, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const lines: string[] = [];
  if (company.address) lines.push(company.address);
  const contact = [company.phone, company.email].filter(Boolean).join("  •  ");
  if (contact) lines.push(contact);
  if (company.gstin) lines.push(`GSTIN: ${company.gstin}`);
  doc.text(lines, 40, 28);

  // Title pill on right
  doc.setFillColor(...NAVY);
  doc.roundedRect(150, 14, 46, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 173, 21, { align: "center" });

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(14, 42, 196, 42);
}

function metaRow(doc: jsPDF, leftLabel: string, leftVal: string, rightLabel: string, rightVal: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(leftLabel, 14, y);
  doc.text(rightLabel, 130, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 50);
  doc.text(leftVal, 35, y);
  doc.text(rightVal, 152, y);
}

function partyBlock(doc: jsPDF, party: PartySnap, y: number) {
  doc.setFillColor(248, 246, 240);
  doc.roundedRect(14, y, 182, 24, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("BILL TO", 18, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 25, 50);
  doc.text(party.name || "—", 18, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const meta: string[] = [];
  if (party.address) meta.push(party.address);
  const sub = [party.phone, party.gstin ? `GSTIN: ${party.gstin}` : null, party.state].filter(Boolean).join("  •  ");
  if (sub) meta.push(sub);
  doc.text(meta, 18, y + 16);
}

function footer(doc: jsPDF, signatureLabel: string) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(140, pageH - 32, 196, pageH - 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(signatureLabel || "Authorised Signatory", 168, pageH - 27, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("This is a computer generated document.", 14, pageH - 10);
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
  await header(doc, opts.company, "CHALLAN");

  metaRow(doc, "Challan No:", opts.challanNo, "Date:", opts.date, 50);
  partyBlock(doc, opts.party, 56);

  autoTable(doc, {
    startY: 86,
    head: [["S.No", "Description", "Quantity", "Remark"]],
    body: opts.items.map((it, i) => [
      String(i + 1),
      it.description || "",
      String(it.quantity ?? ""),
      it.remark || "",
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3, textColor: [30, 30, 50] },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 50 },
    },
    alternateRowStyles: { fillColor: [250, 248, 242] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  if (opts.remark) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("Remark:", 14, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 70);
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
  await header(doc, opts.company, "TAX INVOICE");

  metaRow(doc, "Bill No:", opts.billNo, "Date:", opts.date, 50);
  partyBlock(doc, opts.party, 56);

  autoTable(doc, {
    startY: 86,
    head: [["S.No", "Description", "Weight (kg)", "Rate (₹/kg)", "Amount (₹)"]],
    body: opts.items.map((it, i) => [
      String(i + 1),
      it.description || "",
      fmtNum(it.weight, 3),
      fmtNum(it.rate, 2),
      fmtNum(it.amount, 2),
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3, textColor: [30, 30, 50] },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
    },
    alternateRowStyles: { fillColor: [250, 248, 242] },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Totals box on right
  const boxX = 120, boxW = 76;
  const rows: Array<[string, string]> = [["Subtotal", fmtINR(opts.subtotal)]];
  if (opts.cgst_percent > 0) rows.push([`CGST @ ${opts.cgst_percent}%`, fmtINR(opts.cgst_amount)]);
  if (opts.sgst_percent > 0) rows.push([`SGST @ ${opts.sgst_percent}%`, fmtINR(opts.sgst_amount)]);
  if (opts.igst_percent > 0) rows.push([`IGST @ ${opts.igst_percent}%`, fmtINR(opts.igst_amount)]);

  doc.setFontSize(10);
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(k, boxX, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 60);
    doc.text(v, boxX + boxW, y, { align: "right" });
    y += 6;
  });

  // Grand total
  doc.setFillColor(...NAVY);
  doc.rect(boxX - 2, y - 2, boxW + 4, 9, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", boxX, y + 4);
  doc.text(fmtINR(opts.total), boxX + boxW, y + 4, { align: "right" });
  y += 14;

  // Amount in words
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Amount in Words:", 14, y);
  doc.setFont("helvetica", "italic"); doc.setTextColor(40, 40, 60);
  const words = doc.splitTextToSize(amountInWords(opts.total), 180);
  doc.text(words, 14, y + 5);
  y += 5 + words.length * 4 + 4;

  if (opts.notes) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 70);
    doc.text(doc.splitTextToSize(opts.notes, 180), 30, y);
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
  await header(doc, opts.company, "RECEIPT");
  metaRow(doc, "Date:", opts.date, "Mode:", (opts.mode || "").toUpperCase(), 50);

  doc.setFillColor(248, 246, 240);
  doc.roundedRect(14, 56, 182, 24, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("RECEIVED FROM", 18, 61);
  doc.setFontSize(13); doc.setTextColor(20, 25, 50);
  doc.text(opts.partyName || "—", 18, 70);
  if (opts.reference) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text(`Ref: ${opts.reference}`, 18, 76);
  }

  // Amount block
  doc.setFillColor(...NAVY);
  doc.rect(14, 92, 182, 16, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("AMOUNT RECEIVED", 18, 102);
  doc.setFontSize(16);
  doc.text(fmtINR(opts.amount), 192, 103, { align: "right" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Amount in Words:", 14, 120);
  doc.setFont("helvetica", "italic"); doc.setTextColor(40, 40, 60);
  const words = doc.splitTextToSize(amountInWords(opts.amount), 180);
  doc.text(words, 14, 125);

  if (opts.notes) {
    const ny = 125 + words.length * 4 + 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text("Notes:", 14, ny);
    doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 70);
    doc.text(doc.splitTextToSize(opts.notes, 180), 30, ny);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`Receipt-${opts.partyName.replace(/\s+/g, "_")}-${opts.date}.pdf`);
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
  await header(doc, opts.company, "BILL GIVEN");
  metaRow(doc, "Bill No:", opts.billNo, "Date:", opts.date, 50);

  doc.setFillColor(248, 246, 240);
  doc.roundedRect(14, 56, 182, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("PARTY", 18, 61);
  doc.setFontSize(12); doc.setTextColor(20, 25, 50);
  doc.text(opts.partyName || "—", 18, 70);

  doc.setFillColor(...NAVY);
  doc.rect(14, 86, 182, 16, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("BILL AMOUNT", 18, 96);
  doc.setFontSize(16);
  doc.text(fmtINR(opts.amount), 192, 97, { align: "right" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Amount in Words:", 14, 114);
  doc.setFont("helvetica", "italic"); doc.setTextColor(40, 40, 60);
  const words = doc.splitTextToSize(amountInWords(opts.amount), 180);
  doc.text(words, 14, 119);

  if (opts.notes) {
    const ny = 119 + words.length * 4 + 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
    doc.text("Notes:", 14, ny);
    doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 70);
    doc.text(doc.splitTextToSize(opts.notes, 180), 30, ny);
  }

  footer(doc, opts.company.signature_label || "For " + opts.company.company_name);
  doc.save(`BillGiven-${opts.billNo || opts.partyName}-${opts.date}.pdf`);
}
