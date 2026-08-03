# ⭐ Dhruv Star Study Tracker

A clean, modern full-stack web application for **Dhruv Star Academy** to monitor daily student attendance and 4-hour self-study progress.

---

## 🚀 Quick Start

### 1. Install all dependencies
```bash
npm install            # root (concurrently)
cd backend && npm install
cd ../frontend && npm install
```

### 2. Run both servers together (from root)
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 — Backend API
cd backend && npm start        # Runs on http://localhost:5001

# Terminal 2 — Frontend UI
cd frontend && npm run dev     # Runs on http://localhost:3000
```

### 3. Reset Demo Data
```bash
npm run seed
```

---

## 🔑 Demo Credentials

| Role | Student ID | Password | Status |
|------|-----------|----------|--------|
| Student | `STU001` | `password123` | Rahul Sharma — 4/4 Complete ✅ |
| Student | `STU002` | `password123` | Sneha Patel — 2/4 Pending ⏳ |
| Student | `STU003` | `password123` | Arjun Verma — Absent ❌ |
| Student | `STU004` | `password123` | Ananya Roy — 4/4 Complete ✅ |
| Student | `STU005` | `password123` | Karan Malhotra — 0/4 Pending ⏳ |
| Teacher | `TCH001` | `admin123` | Prof. Vikramaditya 👨‍🏫 |

---

## ✨ Features

### Student Module
- **Morning Attendance** — 4:30 AM–5:30 AM strict window (server + client enforced)
- **4-Hour Daily Self-Study Tracker** — 2 Morning + 2 Night sessions with subject, time range & photo proof upload
- Single submission allowed per day; confetti celebration on completion

### Teacher Dashboard
- **Live Metrics** — Total enrolled, attendance marked, 4/4 submitted, pending, absent
- **Interactive Data Table** — All students with per-hour proof image thumbnails
- **Search & Filter** — Filter by Submitted, Pending, or Absent status
- **Lightbox Inspector** — Click any study proof photo to view full resolution

### Demo Mode
- **Time Simulator Banner** (top of every page) lets you test the attendance window open/closed at any time of day

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Icons | Lucide-React |
| Backend | Node.js, Express.js |
| Database | SQLite (via `sqlite3`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| File Uploads | Multer |

---

## 📁 Project Structure

```
Dhruv-Star-Study-Tracker/
├── backend/
│   ├── data/              # SQLite database (auto-created)
│   ├── uploads/           # Uploaded study proof images
│   ├── middleware/
│   │   ├── auth.js        # JWT & role authorization
│   │   └── upload.js      # Multer image upload config
│   ├── routes/
│   │   ├── auth.js        # /api/auth — login, me
│   │   ├── attendance.js  # /api/attendance — mark, today
│   │   ├── study.js       # /api/study — submit, today
│   │   └── teacher.js     # /api/teacher — dashboard
│   ├── db.js              # SQLite init & helpers
│   ├── seed.js            # Demo data seeder
│   └── server.js          # Express app entry point
├── frontend/
│   └── src/
│       ├── components/    # Navbar, TimeBanner, StatusBadge, ImageModal
│       ├── context/       # AuthContext
│       ├── pages/         # LoginPage, StudentDashboard, TeacherDashboard
│       └── utils/         # Axios API client
└── README.md
```
