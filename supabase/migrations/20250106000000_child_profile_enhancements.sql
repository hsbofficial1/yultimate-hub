-- Child Profile Management Enhancements
-- Adds program enrollment tracking and transfer history

-- Create programs table for managing different programs
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('school', 'community', 'other')),
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create child_program_enrollments table
CREATE TABLE IF NOT EXISTS public.child_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  program_type TEXT CHECK (program_type IN ('school', 'community', 'other')),
  enrollment_date DATE DEFAULT CURRENT_DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(child_id, program_id, enrollment_date)
);

-- Create child_transfer_history table
CREATE TABLE IF NOT EXISTS public.child_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  from_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  to_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  from_program_type TEXT,
  to_program_type TEXT,
  transfer_date DATE NOT NULL,
  reason TEXT,
  transferred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_child_program_enrollments_child_id ON public.child_program_enrollments(child_id);
CREATE INDEX IF NOT EXISTS idx_child_program_enrollments_program_id ON public.child_program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_child_transfer_history_child_id ON public.child_transfer_history(child_id);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_transfer_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programs
CREATE POLICY "Coaches and managers can view programs"
  ON public.programs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Managers and admins can manage programs"
  ON public.programs FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for child_program_enrollments
CREATE POLICY "Coaches and managers can view enrollments"
  ON public.child_program_enrollments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage enrollments"
  ON public.child_program_enrollments FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for child_transfer_history
CREATE POLICY "Coaches and managers can view transfer history"
  ON public.child_transfer_history FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can create transfer history"
  ON public.child_transfer_history FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_program_enrollments_updated_at
  BEFORE UPDATE ON public.child_program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default programs if they don't exist
INSERT INTO public.programs (name, program_type, description)
VALUES
  ('School Program', 'school', 'School-based ultimate frisbee coaching program'),
  ('Community Program', 'community', 'Community-based ultimate frisbee coaching program')
ON CONFLICT DO NOTHING;

-- Note: Storage bucket for child photos needs to be created manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named 'child-photos'
-- 3. Set it to public if you want photos to be publicly accessible
-- 4. Add RLS policies if needed for access control

