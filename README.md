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

### 4. Environment file backup
The backend stores secrets in `backend/.env` and a backup copy is kept at `backend/.env.backup` for recovery.

Keep both files private and do not commit them to a public repository. If you need to restore credentials, copy the backup back over the main env file.

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
- **Weekly Slot Booking** — students book the upcoming Monday–Saturday plan on Sunday, or any day when a teacher opens booking
- Single submission allowed per day; confetti celebration on completion

### Teacher Dashboard
- **Live Metrics** — Total enrolled, attendance marked, 4/4 submitted, pending, absent
- **Interactive Data Table** — All students with per-hour proof image thumbnails
- **Search & Filter** — Filter by Submitted, Pending, or Absent status
- **Booking Window Control** — open or close upcoming-week slot booking for all students
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

## 📱 Installable web app

The frontend is configured as a Progressive Web App (PWA). Once deployed over HTTPS, open it in a browser and use **Install app** (desktop) or **Add to Home Screen** (mobile) to install it.

The frontend is deployed to GitHub Pages. The API can run as a Supabase Edge Function, so no separate Express host is required. The Edge Function uses the existing Supabase database and Storage bucket. Study proof images become eligible for deletion 48 hours after their individual Storage upload time, not after the slot is booked. Supabase Cron checks every minute, so physical deletion occurs on the first run after the 48-hour mark.

Before switching the live frontend to the Supabase API:

1. Run `supabase/migrations/20260928_limit_study_photo_uploads.sql` if not already applied, then run `supabase/migrations/20260928_study_photo_upload_expiry.sql` and `supabase/migrations/20261005_add_booking_settings.sql` in the Supabase SQL Editor. The expiry migration backfills existing photos using Storage upload timestamps; the booking settings migration creates the teacher-controlled student booking window.
2. In Supabase **Project Settings > Edge Functions > Secrets**, add the existing `JWT_SECRET` and `TEACHER_INVITE_CODE` values from `backend/.env`, plus `FRONTEND_ORIGIN=https://ynshruthie.github.io`. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.
3. In GitHub **Settings > Secrets and variables > Actions > Variables**, add `VITE_SUPABASE_ANON_KEY` with the Supabase anon/public key. Never add the service-role key as a Vite variable.
4. Create a Supabase personal access token, then add it in GitHub **Settings > Secrets and variables > Actions > Secrets** as `SUPABASE_ACCESS_TOKEN`.
5. In GitHub **Settings > Pages**, set the source to **GitHub Actions**.
6. Push to `main` or `Shruthi`. The workflow deploys `supabase/functions/api`, checks its health, then publishes the frontend configured in `frontend/.env.production`.
7. After the function deploy succeeds, add a Vault secret named `photo_cleanup_bearer` with the same value as `JWT_SECRET`, then run `supabase/schedule-photo-cleanup.sql` in the SQL Editor to enable minute-by-minute cleanup.

The site is `https://ynshruthie.github.io/Dhruv-Star-Study-Tracker/`. Keep the Supabase service-role key and JWT secret server-side. Proof images use private Storage with one-hour signed viewing URLs; the SQL migration removes the app's previous public read/upload policies.

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
