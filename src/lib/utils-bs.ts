// Helpers for BS Dyeing app

export function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function fmtNum(n: number, d = 2): string {
  return Number(n || 0).toFixed(d);
}

// Convert number to Indian English words (Rupees & Paise)
export function amountInWords(num: number): string {
  if (!Number.isFinite(num)) return "Zero Rupees Only";
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = inWords(rupees) + " Rupees";
  if (paise > 0) words += " and " + inWords(paise) + " Paise";
  return words + " Only";
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below100(n % 100) : "");
}

function inWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  let s = "";
  if (crore) s += below100(crore) + " Crore ";
  if (lakh) s += below100(lakh) + " Lakh ";
  if (thousand) s += below100(thousand) + " Thousand ";
  if (n) s += below1000(n);
  return s.trim();
}

export type PricingRule = {
  id: string;
  match_type?: "between" | "equals" | null;
  exact_weight?: number | null;
  min_weight: number;
  max_weight: number;
  rate_per_kg: number;
  label?: string | null;
};

const EPS = 0.0001;

export function rateForWeight(weight: number, rules: PricingRule[]): number {
  if (!rules || rules.length === 0) return 0;
  const w = Number(weight) || 0;
  // Equals rules win first (more specific)
  for (const r of rules) {
    if ((r.match_type ?? "between") === "equals" && r.exact_weight != null) {
      if (Math.abs(w - Number(r.exact_weight)) < EPS) return Number(r.rate_per_kg);
    }
  }
  // Then between rules, smallest range first (more specific match)
  const between = rules
    .filter((r) => (r.match_type ?? "between") === "between")
    .sort((a, b) => (a.max_weight - a.min_weight) - (b.max_weight - b.min_weight));
  for (const r of between) {
    if (w + EPS >= r.min_weight && w - EPS <= r.max_weight) return Number(r.rate_per_kg);
  }
  return 0;
}

export function nextDocNo(prefix: string, lastNo: string | null): string {
  if (!lastNo) return `${prefix}-0001`;
  const m = lastNo.match(/(\d+)$/);
  if (!m) return `${prefix}-0001`;
  const next = String(parseInt(m[1], 10) + 1).padStart(m[1].length, "0");
  return lastNo.replace(/\d+$/, next);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
