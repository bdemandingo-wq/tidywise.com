CREATE TABLE public.rate_limit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  identifier text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_events_lookup
  ON public.rate_limit_events (bucket, identifier, created_at);

-- Only backend (service_role) touches this table. No anon/authenticated grants.
GRANT ALL ON public.rate_limit_events TO service_role;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies: locked to anon/authenticated; service_role bypasses RLS.

-- Atomically checks whether _identifier is under _max hits for _bucket within
-- _window, records the current attempt, and returns TRUE when allowed.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _identifier text,
  _max integer,
  _window interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  -- Opportunistic cleanup of stale rows (older than 1 day).
  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO cnt
  FROM public.rate_limit_events
  WHERE bucket = _bucket
    AND identifier = _identifier
    AND created_at > now() - _window;

  IF cnt >= _max THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events (bucket, identifier)
  VALUES (_bucket, _identifier);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, interval) TO service_role;