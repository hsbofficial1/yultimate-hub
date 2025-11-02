-- Default Tournament Planning Checklist Items
-- Run this SQL to insert default checklist items for a tournament
-- Replace 'TOURNAMENT_ID_HERE' with your actual tournament UUID

-- Usage in Supabase Dashboard:
-- 1. Go to SQL Editor
-- 2. Replace 'TOURNAMENT_ID_HERE' below with your actual tournament ID
-- 3. Run the entire query

-- Pre-Registration Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'pre_registration', 'Secure tournament venue', 'Book and confirm venue availability for all dates', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_registration', 'Obtain required permits', 'Get all necessary permits and permissions from authorities', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_registration', 'Set tournament budget', 'Create comprehensive budget for all tournament expenses', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_registration', 'Define tournament format', 'Decide on tournament structure (round robin, pool play, etc.)', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_registration', 'Set registration dates', 'Determine registration open and close dates', 'high', 'pending');

-- Registration Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'registration', 'Create registration form', 'Design and publish online registration form', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'registration', 'Setup payment system', 'Configure payment gateway for registrations', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'registration', 'Team capacity planning', 'Determine maximum number of teams', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'registration', 'Communicate registration to teams', 'Send invitations and announcements', 'high', 'pending');

-- Pre-Tournament Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Finalize team confirmations', 'Verify all teams are confirmed and paid', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Create pools and brackets', 'Assign teams to pools and generate brackets', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Generate match schedule', 'Create complete match schedule with times and fields', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Assign officials and volunteers', 'Recruit and assign match officials', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Prepare equipment', 'Ensure all equipment is ready and available', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Setup communication channels', 'Create WhatsApp/email groups for teams', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Publish tournament rules', 'Finalize and publish all rules online', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Order trophies and medals', 'Procure awards for winners', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Arrange medical support', 'Secure first aid and medical staff', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Plan parking and logistics', 'Organize parking and arrival logistics', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'pre_tournament', 'Prepare scoreboards', 'Setup physical or digital scoreboards', 'medium', 'pending');

-- During Tournament Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Monitor match progress', 'Track all matches and scores in real-time', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Manage schedule changes', 'Handle any last-minute schedule adjustments', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Coordinate officials', 'Ensure officials are at correct fields', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Track spirit scores', 'Collect and monitor spirit score submissions', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Update standings', 'Keep leaderboards current', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Handle disputes', 'Resolve any rule disputes or issues', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Manage volunteers', 'Coordinate volunteer activities', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'during_tournament', 'Monitor food and beverage', 'Ensure refreshments are available', 'medium', 'pending');

-- Post-Tournament Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Finalize all results', 'Verify and publish final standings', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Calculate final statistics', 'Compile tournament statistics and analytics', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Generate tournament report', 'Create comprehensive post-tournament report', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Collect feedback', 'Survey teams for feedback and improvements', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Settle accounts', 'Finalize all financial transactions', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Archive tournament data', 'Save all tournament data for records', 'low', 'pending'),
    ('TOURNAMENT_ID_HERE', 'post_tournament', 'Debrief with staff', 'Conduct post-tournament review meeting', 'medium', 'pending');

-- Ceremony Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Plan closing ceremony', 'Design ceremony schedule and activities', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Invite speakers', 'Confirm and prepare ceremony speakers', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Prepare awards', 'Organize awards for presentation', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Arrange seating', 'Plan ceremony seating layout', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Setup stage and AV', 'Prepare stage and audio-visual equipment', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'ceremony', 'Plan entertainment', 'Arrange music or entertainment', 'low', 'pending');

-- Logistics Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'logistics', 'Arrange field preparation', 'Ensure all fields are properly marked and ready', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Setup tents and shelters', 'Provide shade and cover areas', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Organize transportation', 'Coordinate transport for teams if needed', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Arrange accommodation', 'Help teams find nearby accommodation if needed', 'low', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Setup food vendors', 'Arrange food stalls or vendors', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Plan restroom facilities', 'Ensure adequate restroom access', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Organize storage', 'Provide secure storage for equipment', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'logistics', 'Plan waste management', 'Arrange for garbage collection', 'medium', 'pending');

-- Rules Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'rules', 'Review WFDF rules', 'Ensure compliance with official rules', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'rules', 'Define tournament-specific rules', 'Create any custom tournament rules', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'rules', 'Communicate rules to teams', 'Share all rules with registered teams', 'critical', 'pending'),
    ('TOURNAMENT_ID_HERE', 'rules', 'Prepare rule clarifications', 'Anticipate and prepare for rule questions', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'rules', 'Train officials on rules', 'Ensure officials know all rules', 'high', 'pending');

-- Seeding Tasks
INSERT INTO public.tournament_checklists (tournament_id, category, task_name, description, priority, status)
VALUES 
    ('TOURNAMENT_ID_HERE', 'seeding', 'Collect team seeding data', 'Gather historical performance data', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'seeding', 'Analyze team strength', 'Evaluate team capabilities for seeding', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'seeding', 'Create balanced pools', 'Ensure competitive balance across pools', 'high', 'pending'),
    ('TOURNAMENT_ID_HERE', 'seeding', 'Publish seeding information', 'Share seeding assignments with teams', 'medium', 'pending'),
    ('TOURNAMENT_ID_HERE', 'seeding', 'Handle seed disputes', 'Address any seeding concerns', 'low', 'pending');

-- Show summary
SELECT 
    category, 
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM public.tournament_checklists 
WHERE tournament_id = 'TOURNAMENT_ID_HERE'
GROUP BY category
ORDER BY category;

