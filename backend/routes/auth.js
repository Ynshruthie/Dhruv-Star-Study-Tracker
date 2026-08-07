const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const loginId = (req.body.student_id || req.body.teacher_id || req.body.login_id || '').trim();
    const { password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Student ID / Teacher ID and Password are required' });
    }

    const cleanId = loginId.toUpperCase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('student_id', cleanId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    const hasBcryptHash = typeof user.password_hash === 'string' && /^\$2[aby]\$/.test(user.password_hash);
    // Earlier Supabase records were stored before password hashing was added.
    // Accept a matching legacy value once, then upgrade it immediately so every
    // subsequent sign-in uses bcrypt.
    const isMatch = hasBcryptHash
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    if (!hasBcryptHash) {
      const password_hash = await bcrypt.hash(password, 10);
      const { error: upgradeError } = await supabase
        .from('users')
        .update({ password_hash })
        .eq('id', user.id);
      if (upgradeError) throw upgradeError;
    }

    const payload = {
      id: user.id,
      student_id: user.student_id,
      name: user.name,
      role: user.role
    };

    // Keep a returning user signed in across app restarts. They can still use
    // Logout at any time, and invalid/expired tokens are rejected by the API.
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, student_id, name, role')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// POST /api/auth/teacher-signup
router.post('/teacher-signup', async (req, res) => {
  try {
    const { name, teacher_id, password, invite_code } = req.body;

    // Validate invite code
    const validCode = process.env.TEACHER_INVITE_CODE;
    if (!invite_code || invite_code !== validCode) {
      return res.status(403).json({ error: 'Invalid invite code. Please contact the administrator.' });
    }

    if (!name || !teacher_id || !password) {
      return res.status(400).json({ error: 'Name, Teacher ID, and Password are all required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if teacher_id already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('student_id', teacher_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: `Teacher ID "${teacher_id.toUpperCase()}" is already taken.` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        student_id: teacher_id.toUpperCase(),
        name: name.trim(),
        password_hash,
        role: 'teacher'
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-login: return a token
    const payload = {
      id: newUser.id,
      student_id: newUser.student_id,
      name: newUser.name,
      role: newUser.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Teacher account created successfully!',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Teacher signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// POST /api/auth/teacher-forgot-password
// Teacher resets are protected with the administrator-issued invite code.
router.post('/teacher-forgot-password', async (req, res) => {
  try {
    const { teacher_id, password, invite_code } = req.body;
    const teacherId = teacher_id?.trim().toUpperCase();
    const validCode = process.env.TEACHER_INVITE_CODE;

    if (!teacherId || !password || !invite_code) {
      return res.status(400).json({ error: 'Teacher ID, new password, and invite code are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (invite_code !== validCode) {
      return res.status(403).json({ error: 'Invalid invite code. Please contact the administrator.' });
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, student_id, name, role')
      .ilike('student_id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle();
    if (teacherError) throw teacherError;
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher account not found.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data: updatedTeacher, error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', teacher.id)
      .select('password_hash')
      .single();
    if (updateError) throw updateError;

    const wasSaved = await bcrypt.compare(password, updatedTeacher.password_hash);
    if (!wasSaved) {
      throw new Error('The new password could not be verified after saving.');
    }

    const payload = {
      id: teacher.id,
      student_id: teacher.student_id,
      name: teacher.name,
      role: teacher.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    res.json({ message: 'Password reset successfully.', token, user: payload });
  } catch (err) {
    console.error('Teacher password reset error:', err);
    res.status(500).json({ error: err.message || 'Unable to reset password. Please try again.' });
  }
});

module.exports = router;
