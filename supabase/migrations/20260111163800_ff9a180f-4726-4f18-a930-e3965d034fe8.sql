-- Create job_channels table for managing job positions/openings
CREATE TABLE public.job_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Freelance',
  location TEXT NOT NULL DEFAULT 'Remote',
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_channels ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active job channels
CREATE POLICY "Anyone can view active job channels"
ON public.job_channels
FOR SELECT
USING (is_active = true);

-- Allow staff to view all job channels (including inactive)
CREATE POLICY "Staff can view all job channels"
ON public.job_channels
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Allow admin and recruiter to manage job channels
CREATE POLICY "Admin and recruiter can insert job channels"
ON public.job_channels
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recruiter')
);

CREATE POLICY "Admin and recruiter can update job channels"
ON public.job_channels
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recruiter')
);

CREATE POLICY "Admin can delete job channels"
ON public.job_channels
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_job_channels_updated_at
BEFORE UPDATE ON public.job_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default job channels from existing hardcoded data
INSERT INTO public.job_channels (title, type, location, description, requirements, display_order) VALUES
('Livery Designer', 'Freelance', 'Remote', 'Create high-quality UK emergency service liveries for Roblox vehicles. Experience with Photoshop or similar required.', ARRAY['Proficient in Photoshop/GIMP', 'Knowledge of UK emergency services', 'Portfolio of previous work', 'Attention to detail'], 1),
('Lua Script Developer', 'Contract', 'Remote', 'Develop and maintain Lua scripts for Roblox roleplay servers. Focus on vehicle systems, MDT, and emergency services functionality.', ARRAY['Strong Lua programming skills', 'Experience with Roblox Studio', 'Understanding of FiveM/Roblox RP mechanics', 'Git version control'], 2),
('Community Moderator', 'Volunteer', 'Remote', 'Help maintain our Discord community, assist customers with questions, and ensure a positive environment for all members.', ARRAY['Active Discord presence', 'Excellent communication skills', 'Previous moderation experience', 'Availability across UK timezone'], 3),
('3D Vehicle Modeler', 'Freelance', 'Remote', 'Create detailed 3D vehicle models optimized for Roblox. Focus on UK police, ambulance, and fire service vehicles.', ARRAY['Blender or Maya proficiency', 'Experience with low-poly modeling', 'Understanding of Roblox import requirements', 'Texture mapping skills'], 4);