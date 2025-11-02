-- Add missing fields to tournament_checklists table
ALTER TABLE public.tournament_checklists 
ADD COLUMN IF NOT EXISTS vertical TEXT,
ADD COLUMN IF NOT EXISTS quantity TEXT,
ADD COLUMN IF NOT EXISTS poc_name TEXT;

-- Fix RLS policy for tournament_checklists to allow viewing for anyone who can view the tournament
-- This makes checklist items visible to all authenticated users who can see the tournament

DROP POLICY IF EXISTS "Tournament personnel can view checklists" ON public.tournament_checklists;
DROP POLICY IF EXISTS "Anyone can view checklists for visible tournaments" ON public.tournament_checklists;

-- Allow viewing if user can view the tournament (more permissive)
-- If tournament is visible (status != 'draft'), authenticated users can view checklists
CREATE POLICY "Anyone can view checklists for visible tournaments"
  ON public.tournament_checklists FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
      AND (
        -- Tournament is not draft (anyone can view)
        t.status != 'draft' OR 
        -- OR user created it
        t.created_by = auth.uid() OR
        -- OR user has admin/tournament_director role
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
      )
    )
  );

-- Keep the manage policy restricted to tournament creators/admins/directors
DROP POLICY IF EXISTS "Tournament personnel can manage checklists" ON public.tournament_checklists;

CREATE POLICY "Tournament personnel can manage checklists"
  ON public.tournament_checklists FOR ALL
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

-- Also add INSERT policy explicitly
DROP POLICY IF EXISTS "Tournament personnel can insert checklists" ON public.tournament_checklists;

CREATE POLICY "Tournament personnel can insert checklists"
  ON public.tournament_checklists FOR INSERT
  WITH CHECK (
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

-- Create default checklist template function
CREATE OR REPLACE FUNCTION public.create_default_checklist_items(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert default checklist items for the new tournament
    INSERT INTO public.tournament_checklists (tournament_id, category, task_name, vertical, quantity, poc_name, description, due_date, notes, status, priority)
    VALUES
    -- Logistics
    (p_tournament_id, 'pre_tournament', 'Get permission for field', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'Collecting Registration Fees', 'Tournament', NULL, 'Cyril', NULL, NULL, 'Get Money from IIM Indore', 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Transport / Travel plan for players', 'Logistics', NULL, 'Lax', 'Metro', '2024-01-07', NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Lunch + Breakfast Vendor', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'Banana Vendor', 'Logistics', NULL, 'Lax', NULL, NULL, 'Need to call him again on 8 Jan', 'completed', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Tent House', 'Logistics', NULL, 'Cyril', '3 Tents - Physio, Streaming, Y-Ultimate Stall Live Stream Platform', NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Water Vendor', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Accommodation Plan', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Storage of equipment at Venue', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Transport / Travel for logistics', 'Logistics', NULL, 'Lax', '- Lax, RK, Vikas, Alex, Deepak, Manjeet by cab/scooter - Nilay, Sapna, Alka, Sheetal, Anita, Megha, Ashish, Rohit with Zamrudpur and Garhi players', '2024-01-08', NULL, 'completed', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Transport / Travel for participants', 'Logistics', NULL, 'Lax', 'Metro', '2024-01-08', NULL, 'completed', 'medium'),
    
    -- Operations
    (p_tournament_id, 'pre_tournament', 'Donor Invitation', 'Ops', NULL, 'Benoy', NULL, '2024-01-05', NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Donor Engagement Plan', 'Ops', NULL, 'Anita Bhengra Sheetal Sanag', NULL, '2024-01-06', NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Social Media Plan', 'SM', NULL, 'Sapna Dalvi Nilay Bhowmick', NULL, NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'First Aid & Physio', 'Tournament', NULL, 'Lax and Cyril', 'Shanya - No Ayushi', '2024-01-03', NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Recruiting Volunteers', 'Tournament', NULL, 'Cyril and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Volunteers Task Mapping', 'Tournament', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Volunteer Training', NULL, NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    
    -- Tournament Operations
    (p_tournament_id, 'pre_tournament', 'Finalising teams', NULL, NULL, 'RK and Lax', NULL, NULL, 'Waiting for Cambridge', 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'Tournament Rules', 'Tournament', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'External Document for Participants', 'Tournament', NULL, 'Lax', NULL, NULL, 'Laxman Rai Use Formulas to duplicate from main tab', 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'SC Briefing', 'Tournament', NULL, 'Lax', NULL, NULL, NULL, 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'Captains Briefing', 'Tournament', NULL, 'Lax', NULL, NULL, 'ID card for everyone', 'completed', 'high'),
    (p_tournament_id, 'pre_tournament', 'Coaches Expectations', 'Tournament', NULL, 'RK and Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Feedback Form for Participants', 'Tournament', NULL, 'Sheetal', 'about how the tournament was conducted', NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'Invitation for Parents', 'Ops', NULL, 'RK', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Invitation for Partners', 'Ops', NULL, 'Benoy', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Player Registration', 'Tournament', NULL, 'Coaches', NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Printing Certificates', NULL, NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Printing Medals', NULL, NULL, 'Nilay and Laxman', NULL, NULL, NULL, 'pending', 'medium'),
    
    -- Accounts
    (p_tournament_id, 'pre_tournament', 'Budget Approval', 'Accounts', NULL, 'Benoy', NULL, '2024-01-06', 'waiting for tent house price', 'pending', 'critical'),
    
    -- Equipment & Supplies
    (p_tournament_id, 'pre_tournament', 'Cleaning and Housekeeping', 'Logistics', NULL, 'Cyril', NULL, NULL, 'Add this in external sheet', 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'Scoreboards', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Chuna', 'Logistics', '20kg', 'Lax', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Disc Bag - Cones, Discs, Markers', 'Logistics', NULL, 'Manjeet and Deepak', '10 Yellow and 10 Orange Cones, 6 USHA New Discs, Flat Markers 20 Orange and 20 Yellow', NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Rope to mark chuna', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Measuring Tape', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Glucon D', 'Logistics', '5kg new and 2.5kg old', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Mega Phone', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Mega Phone Battery', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Garbage Bag', 'Logistics', NULL, 'Suraj', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', '4 Funnel', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Field Making Rope', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Bibs', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, 'Y-U Bibs?', 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Small Board', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'White Board Markers', 'Logistics', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Permanent Marker', 'Logistics', '3', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Banana Transport', 'Logistics', NULL, 'Cyril', NULL, NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'Pens', 'Logistics', '5', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'Blank Sheet', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'First Aid Box', 'Logistics', '2', 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'critical'),
    (p_tournament_id, 'pre_tournament', 'Nails', 'Logistics', NULL, 'Manjeet and Deepak', NULL, NULL, NULL, 'pending', 'low'),
    (p_tournament_id, 'pre_tournament', 'Orange Glucon D', NULL, '15kg', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Hammers', NULL, '2 only buy', NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Garbage Bag in Girls Washroom', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'low'),
    
    -- Communication & Coordination
    (p_tournament_id, 'pre_tournament', 'Inform coaches to invite parents', 'Tournament', NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Put a message on the group for captains meeting', 'Tournament', NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Registration closing time on the group', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Print outs of schedule', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Commentary Gsheet or hard paper', NULL, NULL, NULL, NULL, NULL, 'Take Munis help [Munis: See', 'pending', 'low'),
    
    -- Setup & Operations
    (p_tournament_id, 'pre_tournament', 'Field Marking on Friday after Lunch', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'high'),
    (p_tournament_id, 'pre_tournament', 'Flex for Presentation Ceremony', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Live Streaming Plan', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium'),
    (p_tournament_id, 'pre_tournament', 'Jerseys Gifting', NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'medium');
END;
$$;

-- Create trigger to auto-populate checklist for new tournaments
CREATE OR REPLACE FUNCTION public.auto_populate_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Automatically create default checklist items when a tournament is created
    PERFORM public.create_default_checklist_items(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tournament_created_checklist ON public.tournaments;
CREATE TRIGGER on_tournament_created_checklist
    AFTER INSERT ON public.tournaments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_populate_checklist();

