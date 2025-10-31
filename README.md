# Y-ULTIMATE Hub - Ultimate Frisbee Tournament Management System

## Project info

**URL**: https://lovable.dev/projects/d5d2efc1-ba10-4d0c-8997-098e50671091

## Features

### 1.1 Team Registration System ✓

A comprehensive public registration form with the following features:

- **Team Details**:
  - Team name (validated for uniqueness per tournament)
  - Captain name
  - Contact email
  - Phone number
  - Previous tournament experience (optional)
  - Team logo upload (optional, max 5MB)

- **Player Management**:
  - Add 7-15 players per team
  - Player information: name, age (10-100), gender, email
  - Real-time roster validation

- **Automatic Validations**:
  - Duplicate team names per tournament
  - Age limits (10-100 years)
  - Roster size (minimum 7, maximum 15 players)
  - File type and size validation for logos

- **Email Confirmation**:
  - Automatic email sent upon registration
  - Database trigger for email notifications

- **Status Tracking**:
  - Pending → Approved → Registered
  - Rejection flow available for administrators

### 1.2 Tournament Director Dashboard ✓

A comprehensive team management interface with the following features:

- **Team Management Table**:
  - View all registered teams in a sortable table
  - Search by team name, captain, or email
  - Filter by status (all, pending, approved, registered, rejected)
  - Display team details: name, captain, contact info, player count, status

- **Approve/Reject Teams**:
  - Approve teams individually with optional notes
  - Reject teams with required rejection notes
  - Visual status badges (pending, approved, registered, rejected)
  - One-click approval/rejection from table actions

- **Bulk Operations**:
  - Select multiple teams via checkboxes
  - Select all teams at once
  - Bulk approve or reject multiple teams
  - Bulk action dialog for confirmations

- **Export Functionality**:
  - Export team rosters to CSV format
  - Includes all team details and player counts
  - Timestamped filenames for easy organization

- **Capacity Management**:
  - Real-time team capacity counter (e.g., "12/16 teams registered")
  - Automatic waitlist calculation for teams beyond capacity
  - Visual indicator for waitlisted teams in the tab

- **Waitlist Management**:
  - Teams beyond capacity automatically shown as waitlisted
  - Clear visual indicators for waitlist status
  - Integration with approval workflow

### 1.3 Match Scheduling System ✓

A comprehensive scheduling system with the following features:

- **Bracket Generation**:
  - Auto-generate Round Robin brackets
  - Single Elimination tournament brackets
  - Double Elimination tournament brackets
  - Pool-based tournament brackets
  - Automatic seeding and bracket positioning

- **Schedule Management**:
  - Multi-field scheduling with automatic field rotation
  - Time slot management with match duration and break time settings
  - Configurable start and end times per tournament
  - Pool assignments for pool-based tournaments

- **Conflict Detection**:
  - Automatic detection of back-to-back matches for same teams
  - Warning system for scheduling conflicts
  - Conflict resolution suggestions
  - Database function for real-time conflict checking

- **Export Functionality**:
  - Export to CSV format for Excel compatibility
  - Export to iCal format for calendar applications
  - Export to HTML format for web viewing
  - Timestamped filenames

- **Tournament Settings**:
  - Customizable bracket types per tournament
  - Configurable match duration and break times
  - Multiple field support
  - Flexible time windows
  - Pool configuration

### 1.5 Spirit Scoring System ✓

A comprehensive spirit of the game scoring system with the following features:

- **5-Category Scoring**:
  - Rules Knowledge & Use (0-4 points)
  - Fouls & Body Contact (0-4 points)
  - Fair-Mindedness (0-4 points)
  - Positive Attitude & Self-Control (0-4 points)
  - Communication (0-4 points)
  - Auto-calculated total (/20 points)

- **Submission Controls**:
  - Only submit after match completion
  - One spirit score per team per match
  - Optional text comments field
  - Visual feedback and descriptions

- **Anomaly Detection**:
  - Automatic flag for scores >2 standard deviations from team average
  - Database function for real-time anomaly checking
  - Analytics view for spirit score tracking

- **Dispute Workflow**:
  - Dispute system for contested scores
  - Tournament director resolution capability
  - Dispute reason tracking
  - Resolution status management

- **Reminders & Notifications**:
  - Automatic reminder 2 hours after match completion
  - Trigger-based notification system
  - Email notification support (configurable)

- **Spirit Score Display**:
  - Real-time spirit score viewer
  - Color-coded scores by quality
  - Dispute indicators
  - Historical tracking

<<<<<<< Updated upstream
=======
### 1.6 Live Leaderboards ✓

Real-time tournament standings and performance tracking with the following features:

- **Performance Leaderboard**:
  - Wins, losses, draws, and games played
  - Point differential (goals for/against)
  - Automatic tie-breaker logic
  - Color-coded rankings (Gold, Silver, Bronze)
  - Real-time updates via WebSocket

- **Spirit Leaderboard**:
  - Average spirit score (/20)
  - Number of spirit scores received
  - Rankings by sportsmanship
  - Real-time spirit score updates

- **Combined Leaderboard**:
  - Weighted scoring: 70% performance, 30% spirit
  - Comprehensive team ranking
  - Dual-position display (performance rank + spirit rank)
  - Automatic recalculation on updates

- **Filtering & Views**:
  - Filter by pool/bracket
  - Separate views for each leaderboard type
  - Overall and pool-specific rankings
  - Smooth tab navigation

- **Public Access**:
  - No login required to view leaderboards
  - Accessible at `/tournament/:id/leaderboards`
  - Real-time updates for all viewers
  - WebSocket automatic refresh

- **Tie-Breaker Logic**:
  - 1. Head-to-head record
  - 2. Point differential
  - 3. Spirit score average
  - Automatic calculation in database

- **Visual Indicators**:
  - Medal icons for top 3 positions
  - Color-coded borders and backgrounds
  - Badges for pool assignments
  - Live refresh indicators

### 1.7 Tournament Reports & Analytics ✓

Comprehensive tournament reporting and analytics with the following features:

- **Export Functionality**:
  - Tournament summary export (JSON format, Excel-ready)
  - Final standings export
  - All match results export
  - Spirit scores by team export
  - MVP calculations included

- **Statistics Dashboard**:
  - Final standings display
  - Top spirit scores overview
  - Real-time data from leaderboards
  - Color-coded rankings

- **Analytics & Visualizations**:
  - **Spirit Score Trends**: Line chart showing average spirit scores over time
  - **Pool Competitiveness**: Bar chart of closest average score differentials
  - **Field Utilization**: Pie chart of matches per field
  - **MVP Calculations**: Top scorer + highest spirit combined

- **MVP System**:
  - Top scoring teams by goals scored
  - Highest spirit score teams
  - Combined MVP score (50% performance, 50% spirit)
  - Top 5 MVP teams display
  - Gold highlighting for #1 MVP

- **Historical Comparison**:
  - Compare tournament with previous years
  - Previous tournament selector
  - Trend analysis framework
  - Year-over-year metrics

- **Four-Tab Interface**:
  - **Summary**: Final standings and top spirit scores
  - **Analytics**: Charts and visualizations
  - **MVPs**: Top performing teams
  - **Historical**: Year-over-year comparisons

- **Public Access**:
  - No login required to view reports
  - Accessible at `/tournament/:id/reports`
  - Shareable tournament insights

>>>>>>> Stashed changes
## Database Setup

Run the migrations in order:

```bash
# Apply all migrations
supabase migration up

# Or manually run the migration files
psql <your_database_url> -f supabase/migrations/20250102000000_team_registration_enhancements.sql
psql <your_database_url> -f supabase/migrations/20250103000000_match_scheduling_system.sql
psql <your_database_url> -f supabase/migrations/20250104000000_spirit_scoring_enhancements.sql
```

Migration 1 (Team Registration):
- Add `captain_name` and `previous_experience` fields to the teams table
- Update status constraints to include 'registered'
- Create email trigger for registration confirmations
- Add unique constraint for team names per tournament
- Create storage bucket for team logos
- Set up storage policies for public access

Migration 2 (Match Scheduling):
- Create `tournament_settings` table for bracket configuration
- Add pool, round, and bracket position fields to matches
- Create indexes for performance optimization
- Add conflict detection database function
- Add timestamp update triggers

Migration 3 (Spirit Scoring):
- Add dispute and resolution fields to spirit_scores table
- Create anomaly detection database function
- Create spirit_score_analytics view
- Add reminder notification trigger
- Add dispute management policies

## Storage Bucket

The system uses a Supabase storage bucket named `team-assets` for storing team logos. The bucket is:
- Public (anyone can view)
- Restricted to authenticated users for uploads
- Limited to 5MB file size
- Supports: JPEG, JPG, PNG, GIF, WEBP formats

## Email Configuration

**Note**: The email trigger is currently a placeholder. To implement actual email sending:

1. Set up Supabase Edge Functions for email sending
2. Or integrate with an external service (SendGrid, AWS SES, etc.)
3. Update the `send_team_registration_email()` function in the migration

Example using Supabase Edge Functions:
```typescript
// supabase/functions/send-registration-email/index.ts
// Implement email sending logic here
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d5d2efc1-ba10-4d0c-8997-098e50671091) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d5d2efc1-ba10-4d0c-8997-098e50671091) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
