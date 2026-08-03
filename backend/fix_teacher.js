require('dotenv').config({ path: __dirname + '/.env' });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function upsertTeacher() {
  const hashedPassword = await bcrypt.hash('Dhruv@123', 10);

  // Check if teacher already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('student_id', 'DSAT01')
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('users')
      .update({
        name: 'Dhruvan M',
        role: 'teacher',
        password_hash: hashedPassword
      })
      .eq('student_id', 'DSAT01');

    if (error) console.error('Update error:', error);
    else console.log('✅ Teacher account updated successfully!');
  } else {
    // Insert new record
    const { error } = await supabase
      .from('users')
      .insert({
        student_id: 'DSAT01',
        name: 'Dhruvan M',
        role: 'teacher',
        password_hash: hashedPassword
      });

    if (error) console.error('Insert error:', error);
    else console.log('✅ Teacher account created successfully!');
  }

  console.log('Login credentials: ID = DSAT01 | Password = Dhruv@123');
}

upsertTeacher();
