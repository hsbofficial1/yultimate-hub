
-- Migration: 20251029093220

-- Migration: 20251029091403
-- Create user roles enum
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'tournament_director',
  'team_captain',
  'player',
  'coach',
  'program_manager',
  'volunteer'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'player',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'in_progress', 'completed')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published tournaments"
  ON public.tournaments FOR SELECT
  USING (status != 'draft' OR created_by = auth.uid());

CREATE POLICY "Directors and admins can manage tournaments"
  ON public.tournaments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tournament_director')
    )
  );

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  captain_id UUID REFERENCES public.profiles(id) NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved teams"
  ON public.teams FOR SELECT
  USING (status = 'approved' OR captain_id = auth.uid());

CREATE POLICY "Captains can register teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Captains can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = captain_id AND status = 'pending');

CREATE POLICY "Directors can manage all teams"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tournament_director')
    )
  );

-- Team players table
CREATE TABLE public.team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  email TEXT NOT NULL
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players of approved teams"
  ON public.team_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND status = 'approved'
    )
  );

CREATE POLICY "Captains can manage their team players"
  ON public.team_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND captain_id = auth.uid()
    )
  );

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  team_a_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  team_b_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  field TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  team_a_score INTEGER DEFAULT 0 NOT NULL,
  team_b_score INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Directors and volunteers can manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tournament_director', 'volunteer')
    )
  );

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Spirit scores table
CREATE TABLE public.spirit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  from_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  to_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  rules INTEGER NOT NULL CHECK (rules >= 0 AND rules <= 4),
  fouls INTEGER NOT NULL CHECK (fouls >= 0 AND fouls <= 4),
  fairness INTEGER NOT NULL CHECK (fairness >= 0 AND fairness <= 4),
  attitude INTEGER NOT NULL CHECK (attitude >= 0 AND attitude <= 4),
  communication INTEGER NOT NULL CHECK (communication >= 0 AND communication <= 4),
  total INTEGER GENERATED ALWAYS AS (rules + fouls + fairness + attitude + communication) STORED,
  comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, from_team_id)
);

ALTER TABLE public.spirit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spirit scores"
  ON public.spirit_scores FOR SELECT
  USING (true);

CREATE POLICY "Team captains can submit spirit scores"
  ON public.spirit_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = from_team_id AND captain_id = auth.uid()
    )
  );

-- Enable realtime for spirit scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.spirit_scores;

-- Children table (coaching module)
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  photo_url TEXT,
  school TEXT,
  community TEXT,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_whatsapp TEXT,
  medical_notes TEXT,
  join_date DATE DEFAULT CURRENT_DATE NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches and managers can view children"
  ON public.children FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'program_manager')
    )
  );

CREATE POLICY "Coaches and managers can manage children"
  ON public.children FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'program_manager')
    )
  );

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('school', 'community')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches and managers can view sessions"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'program_manager')
    )
  );

CREATE POLICY "Coaches can manage their sessions"
  ON public.sessions FOR ALL
  USING (
    auth.uid() = coach_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'program_manager')
    )
  );

-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  present BOOLEAN NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  synced BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(session_id, child_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches and managers can view attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'program_manager')
    )
  );

CREATE POLICY "Coaches can manage attendance"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.coach_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'program_manager')
    )
  );

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- Migration: 20251029092638
-- Fix security issue: Move roles to separate table
-- Step 1: Create user_roles table and function first
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 2: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Drop all old policies that depend on profiles.role
DROP POLICY IF EXISTS "Coaches and managers can view children" ON public.children;
DROP POLICY IF EXISTS "Coaches and managers can manage children" ON public.children;
DROP POLICY IF EXISTS "Coaches and managers can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches can manage their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Coaches and managers can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Coaches can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Directors and admins can manage tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Directors can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Directors and volunteers can manage matches" ON public.matches;

-- Step 4: Now drop the role column
ALTER TABLE public.profiles DROP COLUMN role;

-- Step 5: Create new policies using has_role function
CREATE POLICY "Coaches and managers can view children"
  ON public.children
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage children"
  ON public.children
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can view sessions"
  ON public.sessions
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches can manage their sessions"
  ON public.sessions
  FOR ALL
  USING (
    auth.uid() = coach_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can view attendance"
  ON public.attendance
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches can manage attendance"
  ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = attendance.session_id AND s.coach_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Directors and admins can manage tournaments"
  ON public.tournaments
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'tournament_director')
  );

CREATE POLICY "Directors can manage all teams"
  ON public.teams
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'tournament_director')
  );

CREATE POLICY "Directors and volunteers can manage matches"
  ON public.matches
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'tournament_director') OR
    public.has_role(auth.uid(), 'volunteer')
  );

-- Step 6: Helper function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

-- Step 7: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  
  -- Insert role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  );
  
  RETURN NEW;
END;
$$;

