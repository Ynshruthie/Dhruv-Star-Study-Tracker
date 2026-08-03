const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { student_id, password } = req.body;

    if (!student_id || !password) {
      return res.status(400).json({ error: 'Student ID / Username and Password are required' });
    }

    const cleanId = student_id.trim().toUpperCase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('student_id', cleanId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid ID or password' });
    }

    const payload = {
      id: user.id,
      student_id: user.student_id,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

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
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

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

module.exports = router;
