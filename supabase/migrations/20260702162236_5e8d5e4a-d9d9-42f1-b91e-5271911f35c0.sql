REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, interval) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, interval) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, interval) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, interval) TO service_role;