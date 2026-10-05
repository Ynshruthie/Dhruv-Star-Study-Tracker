const { supabase } = require('./db');

const getBookingOpen = async () => {
  const { data, error } = await supabase
    .from('booking_settings')
    .select('booking_open')
    .eq('id', 'global')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.booking_open);
};

const setBookingOpen = async (bookingOpen) => {
  const { data, error } = await supabase
    .from('booking_settings')
    .upsert({
      id: 'global',
      booking_open: bookingOpen,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select('booking_open')
    .single();

  if (error) throw error;
  return Boolean(data.booking_open);
};

module.exports = { getBookingOpen, setBookingOpen };
