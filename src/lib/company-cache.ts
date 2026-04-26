import { supabase } from "@/integrations/supabase/client";

type Cs = Record<string, unknown> | null;
let cache: Cs | undefined;
let inflight: Promise<Cs> | null = null;

export async function getCompanySettings(): Promise<Cs> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = supabase
    .from("company_settings")
    .select("*")
    .maybeSingle()
    .then(({ data }) => {
      cache = (data ?? null) as Cs;
      inflight = null;
      return cache;
    });
  return inflight;
}

export function invalidateCompanySettings() {
  cache = undefined;
  inflight = null;
}
