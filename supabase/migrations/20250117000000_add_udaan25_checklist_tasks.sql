-- Add all UDAAN 25 tournament checklist tasks
-- This migration inserts all tasks from the tournament planning checklist
-- Safe to run multiple times - will check if tasks already exist

-- First, ensure the required columns exist in tournament_checklists table
ALTER TABLE public.tournament_checklists 
ADD COLUMN IF NOT EXISTS vertical TEXT,
ADD COLUMN IF NOT EXISTS quantity TEXT,
ADD COLUMN IF NOT EXISTS poc_name TEXT;

-- Function to add tasks to UDAAN 25 tournament
CREATE OR REPLACE FUNCTION public.add_udaan25_checklist_tasks()
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
    
    -- Insert all checklist tasks
    -- Only insert if they don't already exist (based on tournament_id + task_name)
    INSERT INTO public.tournament_checklists (
        tournament_id, 
        category, 
        task_name, 
        vertical, 
        quantity, 
        poc_name, 
        description, 
        due_date, 
        notes, 
        status, 
        priority
    )
    SELECT * FROM (VALUES
    -- Completed tasks (Status = TRUE)
    (v_tournament_id, 'pre_tournament', 'Get permission for field', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'Finalising teams', NULL, NULL, 'RK and Lax', NULL, NULL, 'Waiting for Cambridge', 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'Tournament Rules', 'Tournament', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'External Document for Participants', 'Tournament', NULL, 'Lax', NULL, NULL, 'Laxman Rai Use Formulas to duplicate from main tab', 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'Lunch + Breakfast Vendor', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'Banana Vendor', 'Logistics', NULL, 'Lax', NULL, NULL, 'Need to call him again on 8 Jan', 'completed', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Transport / Travel for logistics', 'Logistics', NULL, 'Lax', NULL, '2025-01-08'::DATE, '- Lax, RK, Vikas, Alex, Deepak, Manjeet by cab/scooter - Nilay, Sapna, Alka, Sheetal, Anita, Megha, Ashish, Rohit with Zamrudpur and Garhi players', 'completed', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Transport / Travel for participants', 'Logistics', NULL, 'Lax', NULL, '2025-01-08'::DATE, 'Metro', 'completed', 'medium'),
    (v_tournament_id, 'pre_tournament', 'SC Briefing', 'Tournament', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (v_tournament_id, 'pre_tournament', 'Captains Briefing', 'Tournament', NULL, 'Lax', NULL, NULL, 'ID card for everyone', 'completed', 'high'),
    
    -- Pending tasks (Status = FALSE)
    (v_tournament_id, 'pre_tournament', 'Collecting Registraton Fees', 'Tournament', NULL, 'Cyril', NULL, NULL, 'Get Money from IIM Indore', 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Transport / Travel plan for players', 'Logistics', NULL, 'Lax', NULL, '2025-01-07'::DATE, 'Metro', 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Budget Approval', 'Accounts', NULL, 'Benoy', NULL, '2025-01-06'::DATE, 'waiting for tent house price', 'pending', 'critical'),
    (v_tournament_id, 'pre_tournament', 'Tent House', 'Logistics', NULL, 'Cyril', NULL, NULL, '3 Tents - Physio, Streaming, Y-Ultimate Stall Live Stream Platform -', 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Water Vendor', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Accommodation Plan', NULL, NULL, 'NA', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Storage of equipment at Venue', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Donor Invitation', 'Ops', NULL, 'Benoy', NULL, '2025-01-05'::DATE, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Donor Engagement Plan', 'Ops', NULL, 'Anita Bhengra Sheetal Sanag', NULL, '2025-01-06'::DATE, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Social Media Plan', 'SM', NULL, 'Sapna Dalvi Nilay Bhowmick', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'First Aid & Physio', 'Tournament', NULL, 'Lax and Cyril', NULL, '2025-01-03'::DATE, 'Shanya - No Ayushi', 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Recruiting Volunteers', 'Tournament', NULL, 'Cyril and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Volunteers Task Mapping', 'Tournament', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Volunteer Training', NULL, NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Coaches Expectations', 'Tournament', NULL, 'RK and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Feedback Form for Participants about how the tournament was conducted', 'Tournament', NULL, 'Sheetal', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Invitation for Parents', 'Ops', NULL, 'RK', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Invitation for Partners', 'Ops', NULL, 'Benoy', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Player Registration', 'Tournament', NULL, 'Coaches', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Printing Certificates', NULL, NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Printing Medals', NULL, NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Cleaning and Hosuekeeping', 'Logistics', NULL, 'Cyril', NULL, NULL, 'Add this in external sheet', 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Scoreboards', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Chuna', 'Logistics', '20kg', 'Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Disc Bag - 10 Yellow and 10 Orange Cones, 6 USHA New Discs, Flat Markers 20 Oragange and 20 Yellow', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Rope to mark chuna', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Measuring Tape', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Glucon D', 'Logistics', '5kg new and 2.5kg old', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Mega Phone', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Mega Phone Battery', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Garbages Bag', 'Logistics', NULL, 'Suraj', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', '4 Funnel', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Field Making Rope', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Bibs', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, 'Y-U Bibs?', 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Small Board', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'White Board Markers', 'Logistics', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Permanent Marker', 'Logistics', '3', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Banana Transport', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Pens', 'Logistics', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Blank Sheet', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'First Aid Box', 'Logistics', '2', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'critical'),
    (v_tournament_id, 'pre_tournament', 'Nails', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Inform coaches to invite parents', 'Tournament', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Put a message on the group for captains meeting', 'Tournament', NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Registration closing timem on the group', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Print outs of schedule', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Orange Glucon D', NULL, '15kg', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Hammers', NULL, '2 only buy', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Jerseys Gifting', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Garbage Bag in Girls Washroom', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'low'),
    (v_tournament_id, 'pre_tournament', 'Field Marking on Friday after Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (v_tournament_id, 'pre_tournament', 'Flex for Presentation Ceremony', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Live Streaming Plan', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (v_tournament_id, 'pre_tournament', 'Commentary Gsheet or hard paper', NULL, NULL, NULL, NULL, NULL, 'Take Munis help [Munis: See', 'pending', 'low')
    ) AS v(tournament_id, category, task_name, vertical, quantity, poc_name, description, due_date, notes, status, priority)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.tournament_checklists tc
        WHERE tc.tournament_id = v.tournament_id 
        AND tc.task_name = v.task_name
    );
    
    RAISE NOTICE 'Successfully added all checklist tasks to tournament: %', v_tournament_id;
END;
$$;

-- Execute the function to add tasks
DO $$
BEGIN
    PERFORM public.add_udaan25_checklist_tasks();
END $$;

-- Drop the function after execution to clean up
DROP FUNCTION IF EXISTS public.add_udaan25_checklist_tasks();

