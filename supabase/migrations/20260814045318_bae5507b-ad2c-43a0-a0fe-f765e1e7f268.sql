ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS crm_sync_status text,
  ADD COLUMN IF NOT EXISTS crm_synced_at   timestamptz,
  ADD COLUMN IF NOT EXISTS crm_error       text;

COMMENT ON COLUMN public.bookings.crm_sync_status IS
  'Result of forwarding this booking to the jointidywise CRM: ''synced'' | ''failed'' | ''unreachable''. NULL means the forward was never attempted (e.g. bookings created before 2026-08-14).';
COMMENT ON COLUMN public.bookings.crm_synced_at IS
  'When the CRM accepted this booking. NULL unless crm_sync_status = ''synced''.';
COMMENT ON COLUMN public.bookings.crm_error IS
  'Why the forward failed, truncated. NULL when crm_sync_status = ''synced''.';