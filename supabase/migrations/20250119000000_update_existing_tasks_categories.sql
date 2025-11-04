-- Update existing checklist tasks to use correct categories based on vertical mapping
-- This migration updates tasks that were created with the old category assignments

-- Function to update existing tasks with correct categories
CREATE OR REPLACE FUNCTION public.update_existing_tasks_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Find tournament by name (try both "UDAAN 25" and "UDAAN 2025")
    SELECT id INTO v_tournament_id
    FROM public.tournaments
    WHERE name ILIKE '%UDAAN%25%' OR name ILIKE '%UDAAN%2025%'
    LIMIT 1;
    
    -- If tournament not found, raise an error
    IF v_tournament_id IS NULL THEN
        RAISE EXCEPTION 'Tournament "UDAAN 25" or "UDAAN 2025" not found. Please create the tournament first.';
    END IF;
    
    -- Update tasks based on task_name mappings
    -- This updates existing tasks to the correct categories
    
    -- Logistics tasks (all tasks with Logistics vertical)
    UPDATE public.tournament_checklists
    SET category = 'logistics'
    WHERE tournament_id = v_tournament_id
    AND (
        -- Match by exact task name
        task_name IN (
            'Get permission for field',
            'Lunch + Breakfast Vendor',
            'Banana Vendor',
            'Transport / Travel for logistics',
            'Transport / Travel for participants',
            'Transport / Travel plan for players',
            'Tent House',
            'Water Vendor',
            'Storage of equipment at Venue',
            'Cleaning and Hosuekeeping',
            'Scoreboards',
            'Chuna',
            'Rope to mark chuna',
            'Measuring Tape',
            'Glucon D',
            'Mega Phone',
            'Mega Phone Battery',
            'Garbages Bag',
            '4 Funnel',
            'Field Making Rope',
            'Bibs',
            'Small Board',
            'White Board Markers',
            'Permanent Marker',
            'Banana Transport',
            'Pens',
            'Blank Sheet',
            'First Aid Box',
            'Nails'
        )
        -- Match Disc Bag by partial name (full name is too long and may vary)
        OR task_name LIKE 'Disc Bag%'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % logistics tasks', v_updated_count;
    
    -- Tournament tasks (all tasks with Tournament vertical)
    UPDATE public.tournament_checklists
    SET category = 'tournament'
    WHERE tournament_id = v_tournament_id
    AND task_name IN (
        'Tournament Rules',
        'External Document for Participants',
        'SC Briefing',
        'Captains Briefing',
        'Collecting Registraton Fees',
        'First Aid & Physio',
        'Recruiting Volunteers',
        'Volunteers Task Mapping',
        'Coaches Expectations',
        'Feedback Form for Participants about how the tournament was conducted',
        'Player Registration',
        'Inform coaches to invite parents',
        'Put a message on the group for captains meeting'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % tournament tasks', v_updated_count;
    
    -- Ops tasks (all tasks with Ops vertical)
    UPDATE public.tournament_checklists
    SET category = 'ops'
    WHERE tournament_id = v_tournament_id
    AND task_name IN (
        'Donor Invitation',
        'Donor Engagement Plan',
        'Invitation for Parents',
        'Invitation for Partners'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % ops tasks', v_updated_count;
    
    -- Social Media tasks (all tasks with SM vertical)
    UPDATE public.tournament_checklists
    SET category = 'social_media'
    WHERE tournament_id = v_tournament_id
    AND task_name IN (
        'Social Media Plan'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % social_media tasks', v_updated_count;
    
    -- Accounts tasks (all tasks with Accounts vertical)
    UPDATE public.tournament_checklists
    SET category = 'accounts'
    WHERE tournament_id = v_tournament_id
    AND task_name IN (
        'Budget Approval'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % accounts tasks', v_updated_count;
    
    -- Ceremony tasks
    UPDATE public.tournament_checklists
    SET category = 'ceremony'
    WHERE tournament_id = v_tournament_id
    AND task_name IN (
        'Flex for Presentation Ceremony'
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % ceremony tasks', v_updated_count;
    
    -- Tasks with empty vertical remain as pre_tournament (no update needed)
    -- These include: Finalising teams, Accommodation Plan, Volunteer Training,
    -- Printing Certificates, Printing Medals, Registration closing timem on the group,
    -- Print outs of schedule, Orange Glucon D, Hammers, Jerseys Gifting,
    -- Garbage Bag in Girls Washroom, Field Marking on Friday after Lunch,
    -- Live Streaming Plan, Commentary Gsheet or hard paper
    
    RAISE NOTICE 'Successfully updated all existing tasks with correct categories for tournament: %', v_tournament_id;
END;
$$;

-- Execute the function to update tasks
DO $$
BEGIN
    PERFORM public.update_existing_tasks_categories();
END $$;

-- Drop the function after execution to clean up
DROP FUNCTION IF EXISTS public.update_existing_tasks_categories();

-- Add team_id and team_name columns to ceremony_speakers for team speeches
ALTER TABLE public.ceremony_speakers
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Create index for faster team lookups
CREATE INDEX IF NOT EXISTS idx_ceremony_speakers_team_id ON public.ceremony_speakers(team_id);

-- Tournament Rules Document Table (for full rules page)
CREATE TABLE IF NOT EXISTS public.tournament_rules_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'All games are played by WFDF 2021 rules',
    rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_rules_documents_tournament_id ON public.tournament_rules_documents(tournament_id);

ALTER TABLE public.tournament_rules_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tournament rules documents" ON public.tournament_rules_documents;
CREATE POLICY "Anyone can view tournament rules documents"
    ON public.tournament_rules_documents FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Tournament personnel can manage rules documents" ON public.tournament_rules_documents;
CREATE POLICY "Tournament personnel can manage rules documents"
    ON public.tournament_rules_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tournament_rules_documents_updated_at ON public.tournament_rules_documents;
CREATE TRIGGER update_tournament_rules_documents_updated_at
BEFORE UPDATE ON public.tournament_rules_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add seed_number column to teams table for tournament seeding
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS seed_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_teams_seed_number ON public.teams(seed_number);
