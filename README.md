# Y-Ultimate Hub - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [How It Works](#how-it-works)
6. [Account Setup](#account-setup)
7. [Database Setup](#database-setup)
8. [Installation & Setup](#installation--setup)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**Y-Ultimate Hub** is a comprehensive web platform for managing Ultimate Frisbee tournaments and youth coaching programs. The system handles everything from tournament registration and match scheduling to youth program attendance tracking and developmental assessments.

### Key Capabilities

- **Tournament Management**: Complete tournament lifecycle from registration to results
- **Youth Program Management**: Track sessions, attendance, and child development
- **Real-time Leaderboards**: Live tournament standings and spirit scores
- **Assessment System**: LSAS (Life Skills Assessment Scale) tracking for child development
- **Offline Support**: Attendance tracking works offline and syncs when online
- **Role-Based Access**: Secure permissions system for different user types

---

## 🏗️ System Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL database + Authentication + Storage)
- **State Management**: React Context API + TanStack Query
- **Routing**: React Router v6

### Project Structure

```
yultimate-web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui components
│   │   └── ...              # Feature-specific components
│   ├── pages/               # Page components (routes)
│   ├── contexts/            # React contexts (Auth, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   └── integrations/        # Supabase client & types
├── supabase/
│   └── migrations/          # Database migration files
├── scripts/                 # Utility scripts (CSV imports, etc.)
└── public/                  # Static assets
```

---

## 👥 User Roles & Permissions

The system uses a **role-based access control (RBAC)** system with 7 distinct user roles. Users can have multiple roles assigned to them.

### Role Definitions

#### 1. **Admin** 🔑
**Full system access** - Can do everything in the system.

**Permissions:**
- ✅ Create, edit, and delete tournaments
- ✅ Manage all teams and players
- ✅ Assign user roles to other users
- ✅ Access all reports and analytics
- ✅ Manage children profiles and assessments
- ✅ Create and manage sessions
- ✅ View and edit all attendance records
- ✅ Manage tournament settings and configurations
- ✅ Access closing ceremony planning
- ✅ Export data in various formats

**Navigation Access:**
- Dashboard, Tournaments, Players, Sessions, Reports, Leaderboards

---

#### 2. **Tournament Director** 🏆
**Tournament management** - Handles all tournament operations.

**Permissions:**
- ✅ Create and manage tournaments
- ✅ Approve/reject team registrations
- ✅ Manage team rosters
- ✅ Create and schedule matches
- ✅ View match scores and spirit scores
- ✅ Manage tournament settings (brackets, pools, seeding)
- ✅ Access tournament planning checklists
- ✅ View tournament leaderboards
- ✅ Export tournament data
- ❌ Cannot manage user roles
- ❌ Cannot access youth program features (children, sessions)

**Navigation Access:**
- Dashboard, Tournaments

---

#### 3. **Coach** 🎓
**Session management** - Manages coaching sessions and attendance.

**Permissions:**
- ✅ Create and manage their own sessions
- ✅ Mark attendance for their sessions
- ✅ View children profiles (read-only)
- ✅ Record LSAS assessments for children
- ✅ Track home visits
- ✅ View attendance reports for their sessions
- ✅ Access streak leaderboard
- ✅ View coaching workload dashboard
- ❌ Cannot create/delete children
- ❌ Cannot manage tournaments
- ❌ Cannot manage other coaches' sessions

**Navigation Access:**
- Dashboard, Players (view only), Sessions, Reports, Leaderboards

---

#### 4. **Program Manager** 📊
**Program oversight** - Manages youth programs and participants.

**Permissions:**
- ✅ Create and manage children profiles
- ✅ Create and manage all sessions (not just own)
- ✅ View and manage all attendance records
- ✅ Create LSAS assessments
- ✅ View all reports and analytics
- ✅ Access workload dashboards
- ✅ Manage program enrollments
- ❌ Cannot manage tournaments
- ❌ Cannot assign user roles

**Navigation Access:**
- Dashboard, Players, Sessions, Reports, Leaderboards

---

#### 5. **Team Captain** 👨‍✈️
**Team representation** - Manages team registration and view tournament info.

**Permissions:**
- ✅ Register teams for tournaments
- ✅ View registered team details
- ✅ View tournament schedules and leaderboards
- ✅ Submit spirit scores for matches
- ❌ Cannot create tournaments
- ❌ Cannot manage other teams
- ❌ Cannot access youth program features

**Navigation Access:**
- Dashboard, Tournaments

---

#### 6. **Player** 🏃
**Basic participation** - Can view tournaments and register teams.

**Permissions:**
- ✅ View tournaments and leaderboards (public)
- ✅ Register teams for tournaments
- ✅ View their team's information
- ❌ Cannot manage tournaments
- ❌ Cannot create sessions
- ❌ Limited access to most features

**Navigation Access:**
- Dashboard, Tournaments

---

#### 7. **Volunteer** 🤝
**Tournament assistance** - Helps with tournament operations.

**Permissions:**
- ✅ Enter match scores
- ✅ Submit spirit scores
- ✅ View tournament information
- ✅ Access match scheduling
- ❌ Cannot approve/reject teams
- ❌ Cannot create tournaments
- ❌ Cannot access youth program features

**Navigation Access:**
- Dashboard, Tournaments

---

### Permission Matrix

| Feature | Admin | Tournament Director | Coach | Program Manager | Team Captain | Player | Volunteer |
|---------|-------|---------------------|-------|-----------------|--------------|--------|-----------|
| Create Tournaments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Teams | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Matches | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Submit Spirit Scores | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Children | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create Sessions | ✅ | ❌ | ✅ (own) | ✅ (all) | ❌ | ❌ | ❌ |
| Mark Attendance | ✅ | ❌ | ✅ (own sessions) | ✅ (all) | ❌ | ❌ | ❌ |
| LSAS Assessments | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ❌ | ✅ (limited) | ✅ | ❌ | ❌ | ❌ |
| Manage User Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🎮 Core Features

### 1. Tournament Management System

#### Team Registration
- **Public Registration Form**: Teams can register for tournaments without login (or with login for team captains)
- **Team Details**: Name, captain info, contact details, previous experience, logo upload (max 5MB)
- **Player Management**: 7-15 players per team with name, age, gender, email
- **Validation**: Duplicate team names, age limits (10-100), roster size validation
- **Status Workflow**: Pending → Approved → Registered (or Rejected)

#### Tournament Director Dashboard
- **Team Management**: View, search, filter teams by status
- **Bulk Operations**: Approve/reject multiple teams at once
- **Capacity Management**: Real-time team count and waitlist tracking
- **Export**: CSV export of team rosters
- **Team Details**: View full team information, player rosters

#### Match Scheduling
- **Bracket Types**:
  - Round Robin
  - Single Elimination
  - Double Elimination
  - Pool-based tournaments
- **Schedule Management**:
  - Multi-field scheduling with field rotation
  - Configurable time slots and match duration
  - Break time management
  - Pool assignments
- **Conflict Detection**: Automatic detection of back-to-back matches
- **Export Options**: CSV, iCal, HTML formats

#### Match Scoring
- **Live Scoring**: Real-time score updates
- **Spirit Score Submission**: 5-category scoring system
- **Score Validation**: Only submit after match completion
- **Dispute System**: Dispute contested spirit scores

#### Leaderboards
- **Performance Leaderboard**: Wins, losses, draws, point differential
- **Spirit Leaderboard**: Average spirit scores (/20 points)
- **Combined Leaderboard**: 70% performance + 30% spirit weighted scoring
- **Tie-Breaker Logic**: Head-to-head → Point differential → Spirit score
- **Public Access**: No login required at `/tournament/:id/leaderboards`
- **Real-time Updates**: WebSocket-based live updates

---

### 2. Youth Program Management

#### Children Profiles
- **Profile Information**: Name, age, gender, school, community, photo
- **Program Enrollments**: Track which programs children are enrolled in
- **Badges System**: Achievement badges for milestones (attendance streaks, etc.)
- **Home Visits**: Track home visit history and notes
- **LSAS Assessments**: Track developmental assessments
- **Attendance History**: Timeline view of all attendance records

#### Sessions Management
- **Session Creation**: Coaches create sessions with date, time, location, program type
- **Program Types**: School-based or community-based programs
- **Session Notes**: Record session activities and observations
- **Filtering**: Automatically filter children by program type

#### Attendance Tracking
- **Offline Support**: Works without internet connection using IndexedDB
- **Auto-sync**: Automatically syncs when connection is restored
- **Quick Marking**: Tap-to-mark attendance interface
- **Bulk Actions**: Mark all present/absent
- **Visual Indicators**: Online/offline status, sync status
- **Session Notes**: Add notes during attendance marking

#### Attendance Streaks
- **Automatic Tracking**: System tracks consecutive attendance
- **Streak Leaderboard**: View children with longest attendance streaks
- **Milestone Badges**: Automatic badges for streak milestones (7, 14, 30 days, etc.)
- **Streak History**: View streak start dates and longest streaks

---

### 3. LSAS Assessment System

**Life Skills Assessment Scale (LSAS)** tracks child development across 4 domains:

#### Assessment Domains
1. **Physical** (1-5 scale)
   - Motor skills, coordination, strength
   - Subdomains: Gross motor, fine motor, balance & coordination

2. **Social** (1-5 scale)
   - Teamwork, communication, collaboration
   - Subdomains: Teamwork, communication, social interactions

3. **Emotional** (1-5 scale)
   - Confidence, resilience, self-regulation
   - Subdomains: Self-confidence, resilience, emotional regulation

4. **Cognitive** (1-5 scale)
   - Focus, problem-solving, strategic thinking
   - Subdomains: Focus & attention, problem-solving, decision-making

#### Assessment Types
- **Baseline**: Initial assessment when child joins
- **Endline**: Final assessment when child leaves program
- **Periodic**: Regular assessments during program participation

#### Features
- **Cohort Comparison**: Compare child scores to cohort averages
- **Progress Charts**: Visual progress tracking over time
- **Overdue Alerts**: Automatic alerts for overdue assessments
- **Notes**: Detailed notes for each domain

---

### 4. Reports & Analytics

#### Available Reports
- **Attendance Reports**: Session-wise, child-wise, date range
- **Assessment Reports**: LSAS progress, cohort comparisons
- **Coach Workload**: Session counts, attendance rates, workload distribution
- **Tournament Reports**: Team performance, spirit scores, match results
- **Streak Reports**: Longest streaks, milestone achievements

#### Export Options
- CSV export for data analysis
- PDF reports (where applicable)
- Date range filtering
- Custom filtering options

---

### 5. Tournament Planning Features

#### Planning Checklist
- **Pre-tournament Tasks**: Checklist items for tournament preparation
- **Task Categories**: Logistics, teams, scheduling, equipment, etc.
- **Status Tracking**: Pending, in progress, completed
- **Assignments**: Assign tasks to team members
- **Due Dates**: Track task deadlines

#### Tournament Settings
- **Bracket Configuration**: Choose tournament format
- **Pool Management**: Create and manage pools
- **Seeding**: Manual or automatic seeding
- **Rules**: Tournament-specific rules and guidelines
- **Closing Ceremony**: Plan and manage closing ceremony details

---

## 🔄 How It Works

### Authentication Flow

1. **User Registration/Sign In**
   - Users sign up or sign in via Supabase Auth
   - Email/password authentication
   - Automatic profile creation on signup

2. **Role Assignment**
   - Roles are stored in `user_roles` table
   - Multiple roles per user are supported
   - Admin can assign roles to users

3. **Session Management**
   - JWT tokens stored in browser
   - Automatic token refresh
   - Protected routes check authentication

### Data Flow

#### Tournament Registration Flow
```
1. Team Captain/Player visits registration page
2. Fills team details and player roster
3. System validates data (duplicates, roster size, etc.)
4. Team created with "pending" status
5. Email notification sent (if configured)
6. Tournament Director reviews and approves/rejects
7. Team status changes to "approved" or "rejected"
8. Approved teams can participate in tournament
```

#### Match Scheduling Flow
```
1. Tournament Director creates tournament
2. Sets tournament format (bracket type, pools, etc.)
3. Teams are registered and approved
4. System generates bracket structure
5. Director schedules matches (time, field, pool)
6. System checks for conflicts
7. Schedule is finalized
8. Matches appear in tournament schedule
```

#### Attendance Flow
```
1. Coach creates session
2. On session date, coach opens attendance page
3. System loads children (filtered by program type)
4. Coach marks attendance (works offline)
5. Data saved to IndexedDB (offline) or Supabase (online)
6. If offline, system syncs when connection restored
7. Attendance triggers streak calculation
8. Milestone badges awarded automatically
```

### Offline Support

The attendance system uses **IndexedDB** for offline storage:

1. **Offline Detection**: System detects online/offline status
2. **Local Storage**: Attendance data saved to IndexedDB when offline
3. **Auto-sync**: When connection restored, data syncs to Supabase
4. **Conflict Resolution**: Last-write-wins strategy
5. **Visual Indicators**: UI shows online/offline status

### Real-time Updates

- **Leaderboards**: WebSocket subscriptions for live updates
- **Match Scores**: Real-time score updates
- **Attendance**: Live updates when marked (if online)

---

## 🔐 Account Setup

### Creating Admin Account

#### Method 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Run SQL in Supabase SQL Editor:

```sql
-- Get the user ID from auth.users
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1
)
-- Create profile
INSERT INTO public.profiles (id, email, name)
SELECT id, 'admin@example.com', 'Admin User'
FROM new_user;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM auth.users
WHERE email = 'admin@example.com';
```

#### Method 2: Using Script
See `scripts/create_admin_user.sql` for a complete script.

### Creating Other Role Accounts

1. **Sign Up via UI**: Users can sign up through the registration page
2. **Assign Role**: Admin assigns role via user management (or run SQL):

```sql
-- Assign role to user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'coach'::user_role
FROM auth.users
WHERE email = 'coach@example.com';
```

### Multiple Roles per User

Users can have multiple roles:

```sql
-- User can be both coach and program_manager
INSERT INTO public.user_roles (user_id, role) VALUES
  ('user-id', 'coach'),
  ('user-id', 'program_manager');
```

---

## 🗄️ Database Setup

### Prerequisites

- Supabase account and project
- Supabase CLI (optional, for local development)

### Running Migrations

#### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration files from `supabase/migrations/` in order
3. Run each migration sequentially

#### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Migration Order

Migrations should be run in chronological order (by filename timestamp):

1. `20251029100422_remix_batch_1_migrations.sql` - Core tables and roles
2. `20250106000000_child_profile_enhancements.sql` - Child profiles
3. `20250107000000_attendance_tracking_alerts.sql` - Attendance alerts
4. `20250108000000_attendance_streak_tracker.sql` - Streak tracking
5. `20250110000000_lsas_assessment_system.sql` - LSAS assessments
6. `20250111000000_coach_workload_management.sql` - Coach workload
7. `20250115000000_complete_tournament_setup.sql` - Tournament system
8. `20250119000000_update_existing_tasks_categories.sql` - Task categories
9. `20250120000000_seed_realistic_data.sql` - Seed data (optional)

### Storage Buckets

Create storage bucket for team logos:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `team-assets`
3. Set to **Public** (for viewing)
4. Set policies:
   - **Public Access**: Anyone can view
   - **Authenticated Upload**: Only authenticated users can upload

### Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: For backend scripts (CSV imports), you may also need:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Never commit service role key to version control!**

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Git**
- **Supabase account** and project

### Local Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd yultimate-web

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp env.example.txt .env

# 4. Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# 5. Run database migrations (see Database Setup section)

# 6. Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Building for Production

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview
```

Built files will be in `dist/` directory.

---

## 📦 Deployment

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Other Platforms

Any platform supporting static file hosting works:
- **GitHub Pages**
- **AWS S3 + CloudFront**
- **Azure Static Web Apps**
- **Cloudflare Pages**

**Important**: Set environment variables in your hosting platform's dashboard.

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot connect to Supabase"
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Ensure Supabase project is active
- Check browser console for CORS errors

#### 2. "Permission denied" errors
- Verify user has correct role assigned in `user_roles` table
- Check Row Level Security (RLS) policies in Supabase
- Ensure user is authenticated

#### 3. Migrations fail
- Run migrations in order (by timestamp)
- Check for existing tables/columns before running
- Some migrations use `IF NOT EXISTS` - safe to re-run

#### 4. Offline attendance not syncing
- Check browser console for errors
- Verify IndexedDB is enabled in browser
- Check network connection
- Try manually refreshing page

#### 5. TypeScript errors after migration
- Regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
- Or use Supabase Dashboard → Settings → API → Generate TypeScript types

### Getting Help

1. Check existing documentation files in project root
2. Review migration files for database structure
3. Check Supabase dashboard logs for backend errors
4. Review browser console for frontend errors

---

## 📚 Additional Resources

### Documentation Files

- `START_HERE.md` - Quick start guide
- `COMPLETE_SETUP_GUIDE.md` - Detailed setup instructions
- `TOURNAMENT_ENHANCEMENTS_README.md` - Tournament features
- `TOURNAMENT_PLANNING_SUMMARY.md` - Planning features
- `README_ALL_FEATURES.md` - Complete feature list

### Scripts

- `scripts/create_admin_user.sql` - Create admin account
- `scripts/import_tournament_players.py` - Import players from CSV
- `scripts/import_checklist_items.py` - Import checklist items

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit Pull Requests.

---

**Built with ❤️ for Ultimate Frisbee communities**
