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

//HSB
## Database Setup

Run the migrations in order:

```bash
# Apply the team registration enhancements
supabase migration up

# Or manually run the migration file
psql <your_database_url> -f supabase/migrations/20250102000000_team_registration_enhancements.sql
```

This migration will:
- Add `captain_name` and `previous_experience` fields to the teams table
- Update status constraints to include 'registered'
- Create email trigger for registration confirmations
- Add unique constraint for team names per tournament
- Create storage bucket for team logos
- Set up storage policies for public access

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
