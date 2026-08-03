const { supabase } = require('./db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  console.log('Starting Supabase seed process...');

  try {
    // 1. Clear existing data (in correct order to respect foreign keys)
    console.log('Clearing old data...');
    await supabase.from('study_hours').delete().neq('id', 0);
    await supabase.from('study_submissions').delete().neq('id', 0);
    await supabase.from('attendance').delete().neq('id', 0);
    await supabase.from('users').delete().neq('id', 0);

    // 2. Create Users
    console.log('Creating users...');
    const teacherPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('password123', 10);

    const users = [
      { student_id: 'TCH001', name: 'Dhruv Sir', role: 'teacher', password_hash: teacherPassword },
      { student_id: 'STU001', name: 'Rahul Sharma', role: 'student', password_hash: studentPassword },
      { student_id: 'STU002', name: 'Priya Patel', role: 'student', password_hash: studentPassword },
      { student_id: 'STU003', name: 'Amit Kumar', role: 'student', password_hash: studentPassword },
      { student_id: 'STU004', name: 'Ananya Roy', role: 'student', password_hash: studentPassword },
      { student_id: 'STU005', name: 'Karan Malhotra', role: 'student', password_hash: studentPassword }
    ];

    const { error: userErr } = await supabase.from('users').insert(users);
    if (userErr) throw userErr;

    // 3. Generate Fake Study Photos
    console.log('Creating sample attendance and study records...');
    const dateStr = new Date().toISOString().split('T')[0];

    // STU001 - Present, 4/4 study hours
    await supabase.from('attendance').insert({ student_id: 'STU001', date: dateStr, time: '04:45 AM', status: 'PRESENT' });
    const { data: rahulSub } = await supabase.from('study_submissions').insert({ student_id: 'STU001', date: dateStr, status: 'COMPLETED' }).select().single();
    
    const rahulSubjects = [
      { subject: 'Physics (Mechanics)', time_slot: '05:30 AM - 06:30 AM' },
      { subject: 'Mathematics (Calculus)', time_slot: '06:30 AM - 07:30 AM' },
      { subject: 'Chemistry (Organic)', time_slot: '08:00 PM - 09:00 PM' },
      { subject: 'Computer Science', time_slot: '09:00 PM - 10:00 PM' }
    ];

    for (let i = 0; i < rahulSubjects.length; i++) {
      const hNum = i + 1;
      const imageUrls = [
        `https://via.placeholder.com/600x800.png?text=Rahul+Page+1`,
        `https://via.placeholder.com/600x800.png?text=Rahul+Page+2`
      ];
      await supabase.from('study_hours').insert({
        submission_id: rahulSub.id,
        student_id: 'STU001',
        date: dateStr,
        hour_number: hNum,
        subject: rahulSubjects[i].subject,
        time_slot: rahulSubjects[i].time_slot,
        image_url: JSON.stringify(imageUrls)
      });
    }

    // STU002 - Present, 2/4 study hours
    await supabase.from('attendance').insert({ student_id: 'STU002', date: dateStr, time: '05:15 AM', status: 'PRESENT' });
    const { data: priyaSub } = await supabase.from('study_submissions').insert({ student_id: 'STU002', date: dateStr, status: 'PENDING' }).select().single();
    
    await supabase.from('study_hours').insert({
      submission_id: priyaSub.id, student_id: 'STU002', date: dateStr, hour_number: 1,
      subject: 'Biology (Genetics)', time_slot: '05:30 AM - 06:30 AM', image_url: JSON.stringify([`https://via.placeholder.com/600x800.png?text=Priya+Page+1`])
    });
    await supabase.from('study_hours').insert({
      submission_id: priyaSub.id, student_id: 'STU002', date: dateStr, hour_number: 2,
      subject: 'Chemistry (Physical)', time_slot: '06:30 AM - 07:30 AM', image_url: JSON.stringify([`https://via.placeholder.com/600x800.png?text=Priya+Page+2`])
    });

    // STU003 - Absent
    await supabase.from('attendance').insert({ student_id: 'STU003', date: dateStr, time: '05:45 AM', status: 'ABSENT' });

    // STU004 - Present, 4/4 study hours (Multi-photo heavy)
    await supabase.from('attendance').insert({ student_id: 'STU004', date: dateStr, time: '04:35 AM', status: 'PRESENT' });
    const { data: ananyaSub } = await supabase.from('study_submissions').insert({ student_id: 'STU004', date: dateStr, status: 'COMPLETED' }).select().single();
    
    const ananyaSubjects = [
      { subject: 'Data Structures', time_slot: '05:30 AM - 06:30 AM' },
      { subject: 'Linear Algebra', time_slot: '06:30 AM - 07:30 AM' },
      { subject: 'Electromagnetism', time_slot: '08:30 PM - 09:30 PM' },
      { subject: 'Physical Chemistry', time_slot: '09:30 PM - 10:30 PM' }
    ];

    for (let i = 0; i < ananyaSubjects.length; i++) {
      const hNum = i + 1;
      const imageUrls = [1, 2, 3, 4, 5].map(p => `https://via.placeholder.com/600x800.png?text=Ananya+Page+${p}`);
      await supabase.from('study_hours').insert({
        submission_id: ananyaSub.id,
        student_id: 'STU004',
        date: dateStr,
        hour_number: hNum,
        subject: ananyaSubjects[i].subject,
        time_slot: ananyaSubjects[i].time_slot,
        image_url: JSON.stringify(imageUrls)
      });
    }

    // STU005 - Present, 0 study hours
    await supabase.from('attendance').insert({ student_id: 'STU005', date: dateStr, time: '05:02 AM', status: 'PRESENT' });

    console.log('Seed data inserted into Supabase successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  }
};

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
