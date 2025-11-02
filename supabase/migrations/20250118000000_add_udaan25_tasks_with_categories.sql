-- Add all UDAAN 25 tournament checklist tasks with categories mapped from verticals
-- This migration maps vertical values directly to category values (no vertical column stored)
-- Safe to run multiple times - will check if tasks already exist

-- Ensure the required columns exist in tournament_checklists table
ALTER TABLE public.tournament_checklists 
ADD COLUMN IF NOT EXISTS quantity TEXT,
ADD COLUMN IF NOT EXISTS poc_name TEXT;

-- Add new categories to the CHECK constraint if they don't exist
-- We'll modify the constraint to allow new categories: tournament, ops, social_media, accounts
DO $$
BEGIN
    -- Check if we need to modify the constraint
    -- We'll drop and recreate it with new categories
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%tournament_checklists%category%check%'
    ) THEN
        -- Drop existing constraint
        ALTER TABLE public.tournament_checklists 
        DROP CONSTRAINT IF EXISTS tournament_checklists_category_check;
    END IF;
    
    -- Add new constraint with expanded categories
    ALTER TABLE public.tournament_checklists 
    ADD CONSTRAINT tournament_checklists_category_check 
    CHECK (category IN (
        'pre_registration', 'registration', 'pre_tournament', 'during_tournament',
        'post_tournament', 'ceremony', 'logistics', 'rules', 'seeding',
        'tournament', 'ops', 'social_media', 'accounts'
    ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Function to add tasks to UDAAN 25 tournament with category mapping
CREATE OR REPLACE FUNCTION public.add_udaan25_checklist_tasks_with_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament_id UUID;
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
    
    -- Insert all checklist tasks with categories mapped directly from verticals
    -- Vertical "Logistics" -> category "logistics"
    -- Vertical "Tournament" -> category "tournament"
    -- Vertical "Ops" -> category "ops"
    -- Vertical "SM" -> category "social_media"
    -- Vertical "Accounts" -> category "accounts"
    -- NULL vertical -> category "pre_tournament"
    -- Only insert if they don't already exist (based on tournament_id + task_name)
    INSERT INTO public.tournament_checklists (
        tournament_id, 
        category, 
        task_name, 
        quantity, 
        poc_name, 
        description, 
        due_date, 
        notes, 
        status, 
        priority
    )
    SELECT 
        tournament_id, 
        category,
        task_name,
        quantity,
        poc_name,
        description,
        due_date,
        notes,
        status,
        priority
    FROM (VALUES
    -- Completed tasks (Status = TRUE)
    -- Logistics vertical -> logistics category
    (v_tournament_id, 'logistics', 'Get permission for field', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Finalising teams', NULL, 'RK and Lax', NULL, NULL, 'Waiting for Cambridge', 'completed', 'high'),
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'Tournament Rules', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'tournament', 'External Document for Participants', NULL, 'Lax', NULL, NULL, 'Laxman Rai Use Formulas to duplicate from main tab', 'completed', 'high'),
    (v_tournament_id, 'logistics', 'Lunch + Breakfast Vendor', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'logistics', 'Banana Vendor', NULL, 'Lax', NULL, NULL, 'Need to call him again on 8 Jan', 'completed', 'medium'),
    (v_tournament_id, 'logistics', 'Transport / Travel for logistics', NULL, 'Lax', NULL, '2025-01-08'::DATE, '- Lax, RK, Vikas, Alex, Deepak, Manjeet by cab/scooter - Nilay, Sapna, Alka, Sheetal, Anita, Megha, Ashish, Rohit with Zamrudpur and Garhi players', 'completed', 'medium'),
    (v_tournament_id, 'logistics', 'Transport / Travel for participants', NULL, 'Lax', NULL, '2025-01-08'::DATE, 'Metro', 'completed', 'medium'),
    (v_tournament_id, 'tournament', 'SC Briefing', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'tournament', 'Captains Briefing', NULL, 'Lax', NULL, NULL, 'ID card for everyone', 'completed', 'high'),
    
    -- Pending tasks (Status = FALSE)
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'Collecting Registraton Fees', NULL, 'Cyril', NULL, NULL, 'Get Money from IIM Indore', 'pending', 'high'),
    -- Logistics vertical -> logistics category
    (v_tournament_id, 'logistics', 'Transport / Travel plan for players', NULL, 'Lax', NULL, '2025-01-07'::DATE, 'Metro', 'pending', 'medium'),
    -- Accounts vertical -> accounts category
    (v_tournament_id, 'accounts', 'Budget Approval', NULL, 'Benoy', NULL, '2025-01-06'::DATE, 'waiting for tent house price', 'pending', 'critical'),
    -- Logistics vertical -> logistics category
    (v_tournament_id, 'logistics', 'Tent House', NULL, 'Cyril', NULL, NULL, '3 Tents - Physio, Streaming, Y-Ultimate Stall Live Stream Platform -', 'pending', 'high'),
    (v_tournament_id, 'logistics', 'Water Vendor', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'high'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Accommodation Plan', NULL, 'NA', NULL, NULL, NULL, 'pending', 'medium'),
    -- Logistics vertical -> logistics category
    (v_tournament_id, 'logistics', 'Storage of equipment at Venue', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    -- Ops vertical -> ops category
    (v_tournament_id, 'ops', 'Donor Invitation', NULL, 'Benoy', NULL, '2025-01-05'::DATE, NULL, 'pending', 'medium'),
    (v_tournament_id, 'ops', 'Donor Engagement Plan', NULL, 'Anita Bhengra Sheetal Sanag', NULL, '2025-01-06'::DATE, NULL, 'pending', 'medium'),
    -- SM vertical -> social_media category
    (v_tournament_id, 'social_media', 'Social Media Plan', NULL, 'Sapna Dalvi Nilay Bhowmick', NULL, NULL, NULL, 'pending', 'low'),
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'First Aid & Physio', NULL, 'Lax and Cyril', NULL, '2025-01-03'::DATE, 'Shanya - No Ayushi', 'pending', 'high'),
    (v_tournament_id, 'tournament', 'Recruiting Volunteers', NULL, 'Cyril and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'tournament', 'Volunteers Task Mapping', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Volunteer Training', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'Coaches Expectations', NULL, 'RK and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'tournament', 'Feedback Form for Participants about how the tournament was conducted', NULL, 'Sheetal', NULL, NULL, NULL, 'pending', 'low'),
    -- Ops vertical -> ops category
    (v_tournament_id, 'ops', 'Invitation for Parents', NULL, 'RK', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'ops', 'Invitation for Partners', NULL, 'Benoy', NULL, NULL, NULL, 'pending', 'medium'),
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'Player Registration', NULL, 'Coaches', NULL, NULL, NULL, 'pending', 'high'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Printing Certificates', NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Printing Medals', NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    -- Logistics vertical -> logistics category
    (v_tournament_id, 'logistics', 'Cleaning and Hosuekeeping', NULL, 'Cyril', NULL, NULL, 'Add this in external sheet', 'pending', 'low'),
    (v_tournament_id, 'logistics', 'Scoreboards', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Chuna', '20kg', 'Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Disc Bag - 10 Yellow and 10 Orange Cones, 6 USHA New Discs, Flat Markers 20 Oragange and 20 Yellow', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'logistics', 'Rope to mark chuna', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Measuring Tape', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Glucon D', '5kg new and 2.5kg old', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Mega Phone', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'logistics', 'Mega Phone Battery', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'logistics', 'Garbages Bag', NULL, 'Suraj', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', '4 Funnel', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Field Making Rope', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Bibs', NULL, 'Manjeet and Deepak', NULL, NULL, 'Y-U Bibs?', 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Small Board', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'White Board Markers', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Permanent Marker', '3', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'logistics', 'Banana Transport', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'logistics', 'Pens', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'logistics', 'Blank Sheet', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'logistics', 'First Aid Box', '2', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'critical'),
    (v_tournament_id, 'logistics', 'Nails', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    -- Tournament vertical -> tournament category
    (v_tournament_id, 'tournament', 'Inform coaches to invite parents', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'tournament', 'Put a message on the group for captains meeting', NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Registration closing timem on the group', NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Print outs of schedule', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Orange Glucon D', '15kg', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Hammers', '2 only buy', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Jerseys Gifting', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Garbage Bag in Girls Washroom', NULL, NULL, NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Field Marking on Friday after Lunch', NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    -- Ceremony category
    (v_tournament_id, 'ceremony', 'Flex for Presentation Ceremony', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    -- Empty vertical -> pre_tournament category
    (v_tournament_id, 'pre_tournament', 'Live Streaming Plan', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Commentary Gsheet or hard paper', NULL, NULL, NULL, NULL, 'Take Munis help [Munis: See', 'pending', 'low')
    ) AS v(tournament_id, category, task_name, quantity, poc_name, description, due_date, notes, status, priority)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.tournament_checklists tc
        WHERE tc.tournament_id = v.tournament_id 
        AND tc.task_name = v.task_name
    );
    
    RAISE NOTICE 'Successfully added all checklist tasks with categories to tournament: %', v_tournament_id;
END;
$$;

-- Execute the function to add tasks
DO $$
BEGIN
    PERFORM public.add_udaan25_checklist_tasks_with_categories();
END $$;

-- Drop the function after execution to clean up
DROP FUNCTION IF EXISTS public.add_udaan25_checklist_tasks_with_categories();

