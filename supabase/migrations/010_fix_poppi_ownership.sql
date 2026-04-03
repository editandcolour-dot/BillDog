-- HIGH-05: Add ownership check to get_poppi_id
-- Prevents unauthorized users from extracting decrypted POPIA IDs for cases they don't own.

CREATE OR REPLACE FUNCTION public.get_poppi_id(target_case_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_id TEXT;
  case_owner UUID;
BEGIN
  -- Verify the user owns this case
  SELECT user_id INTO case_owner
  FROM cases
  WHERE id = target_case_id;

  IF case_owner IS NULL OR (case_owner != auth.uid() AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized access to ID';
  END IF;

  -- Proceed to fetch and decrypt
  SELECT decrypted_secret INTO decrypted_id
  FROM vault.decrypted_secrets
  WHERE name = target_case_id::text;

  RETURN decrypted_id;
END;
$$;

-- Secure the function execution
REVOKE EXECUTE ON FUNCTION public.get_poppi_id(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_poppi_id(UUID) TO authenticated;
