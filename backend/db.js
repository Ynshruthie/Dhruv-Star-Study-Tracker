require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to initialize tables via a helper function (if needed later)
// For now, we will rely on seed.js or Supabase UI for table creation.
const initDb = async () => {
  console.log('Using Supabase PostgreSQL Database.');
};

module.exports = {
  supabase,
  initDb
};
