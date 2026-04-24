
-- Company settings (single row per user)
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'BS Dyeing',
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  cgst_percent NUMERIC NOT NULL DEFAULT 2.5,
  sgst_percent NUMERIC NOT NULL DEFAULT 2.5,
  igst_percent NUMERIC NOT NULL DEFAULT 0,
  use_igst BOOLEAN NOT NULL DEFAULT false,
  signature_label TEXT DEFAULT 'For BS Dyeing',
  bill_prefix TEXT NOT NULL DEFAULT 'BILL',
  challan_prefix TEXT NOT NULL DEFAULT 'CH',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing rules: weight range -> rate per kg
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  min_weight NUMERIC NOT NULL,
  max_weight NUMERIC NOT NULL,
  rate_per_kg NUMERIC NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parties
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  state TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challans
CREATE TABLE public.challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challan_no TEXT NOT NULL,
  challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  party_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{si, description, quantity, remark}]
  remark TEXT DEFAULT '',
  billed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  party_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{si, description, weight, rate, amount}]
  challan_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cgst_percent NUMERIC NOT NULL DEFAULT 0,
  sgst_percent NUMERIC NOT NULL DEFAULT 0,
  igst_percent NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid|paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Policies: owner can do everything to their rows
CREATE POLICY "own_company_settings" ON public.company_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_pricing_rules" ON public.pricing_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_parties" ON public.parties FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_challans" ON public.challans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_bills" ON public.bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER t_company_settings BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_parties BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_challans BEFORE UPDATE ON public.challans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_bills BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_parties_user ON public.parties(user_id);
CREATE INDEX idx_challans_user ON public.challans(user_id);
CREATE INDEX idx_bills_user ON public.bills(user_id);
CREATE INDEX idx_pricing_user ON public.pricing_rules(user_id);
