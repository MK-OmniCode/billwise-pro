-- 1. Pricing rules: add match_type and exact_weight
ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT 'between',
  ADD COLUMN IF NOT EXISTS exact_weight numeric;

-- 2. Payments Received table
CREATE TABLE IF NOT EXISTS public.payments_received (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  party_id uuid,
  party_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'cash',
  reference text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments_received ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_payments_received ON public.payments_received;
CREATE POLICY own_payments_received ON public.payments_received
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_payments_received_touch ON public.payments_received;
CREATE TRIGGER trg_payments_received_touch
  BEFORE UPDATE ON public.payments_received
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Bills Given (manual log) table
CREATE TABLE IF NOT EXISTS public.bills_given (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  given_date date NOT NULL DEFAULT CURRENT_DATE,
  bill_no text NOT NULL DEFAULT '',
  party_id uuid,
  party_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bills_given ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_bills_given ON public.bills_given;
CREATE POLICY own_bills_given ON public.bills_given
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_bills_given_touch ON public.bills_given;
CREATE TRIGGER trg_bills_given_touch
  BEFORE UPDATE ON public.bills_given
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();