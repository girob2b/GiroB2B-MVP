-- ============================================================
-- Migration 012: Atomic inquiry creation
--
-- Consolidates daily limit, deduplication and product counter
-- updates into one transactional function executed with
-- service_role only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_directed_inquiry_tx(
  p_buyer_id UUID,
  p_supplier_id UUID,
  p_product_id UUID,
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_buyer_company TEXT,
  p_buyer_city TEXT,
  p_buyer_state TEXT,
  p_description TEXT,
  p_quantity_estimate TEXT,
  p_desired_deadline TEXT,
  p_dedup_key VARCHAR(64),
  p_start_of_day TIMESTAMPTZ,
  p_dedup_since TIMESTAMPTZ,
  p_daily_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_daily_count INT;
  v_duplicate RECORD;
  v_inquiry RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_buyer_id::text), 1, 16))::bit(64)::bigint
  );

  SELECT COUNT(*)
    INTO v_daily_count
    FROM public.inquiries
   WHERE buyer_id = p_buyer_id
     AND created_at >= p_start_of_day;

  IF v_daily_count >= p_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'daily_limit_exceeded'
    );
  END IF;

  SELECT
    id,
    inquiry_type,
    supplier_id,
    product_id,
    buyer_id,
    description,
    quantity_estimate,
    desired_deadline,
    status,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_company,
    buyer_city,
    buyer_state,
    contact_unlocked,
    created_at
    INTO v_duplicate
    FROM public.inquiries
   WHERE dedup_key = p_dedup_key
     AND created_at >= p_dedup_since
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_duplicate IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'deduplicated', true,
      'inquiry', to_jsonb(v_duplicate)
    );
  END IF;

  INSERT INTO public.inquiries (
    buyer_id,
    supplier_id,
    product_id,
    inquiry_type,
    description,
    quantity_estimate,
    desired_deadline,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_company,
    buyer_city,
    buyer_state,
    buyer_consent_to_share,
    dedup_key,
    status
  )
  VALUES (
    p_buyer_id,
    p_supplier_id,
    p_product_id,
    'directed',
    p_description,
    p_quantity_estimate,
    p_desired_deadline,
    p_buyer_name,
    p_buyer_email,
    p_buyer_phone,
    p_buyer_company,
    p_buyer_city,
    p_buyer_state,
    TRUE,
    p_dedup_key,
    'new'
  )
  RETURNING
    id,
    inquiry_type,
    supplier_id,
    product_id,
    buyer_id,
    description,
    quantity_estimate,
    desired_deadline,
    status,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_company,
    buyer_city,
    buyer_state,
    contact_unlocked,
    created_at
    INTO v_inquiry;

  IF p_product_id IS NOT NULL THEN
    UPDATE public.products
       SET inquiry_count = inquiry_count + 1
     WHERE id = p_product_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deduplicated', false,
    'inquiry', to_jsonb(v_inquiry)
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.create_directed_inquiry_tx(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_directed_inquiry_tx(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INT
) TO service_role;
