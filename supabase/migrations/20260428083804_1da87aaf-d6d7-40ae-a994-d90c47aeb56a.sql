-- Attach booking validation triggers (functions exist; triggers were missing)
DROP TRIGGER IF EXISTS bookings_enforce_date_window ON public.bookings;
CREATE TRIGGER bookings_enforce_date_window
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_date_window();

DROP TRIGGER IF EXISTS bookings_set_customer_id ON public.bookings;
CREATE TRIGGER bookings_set_customer_id
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_customer_id();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();