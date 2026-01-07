-- Create badges table to define available badges
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- lucide icon name
    color TEXT NOT NULL DEFAULT 'primary', -- tailwind color theme
    category TEXT NOT NULL CHECK (category IN ('purchase', 'community', 'engagement')),
    requirement_type TEXT NOT NULL, -- e.g., 'order_count', 'total_spent', 'forum_posts', 'reviews', 'account_age'
    requirement_value INTEGER NOT NULL, -- threshold value
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges FOR SELECT 
USING (true);

-- Users can view their own badges
CREATE POLICY "Users can view their own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

-- Anyone can view user badges (for profiles)
CREATE POLICY "Anyone can view all user badges" 
ON public.user_badges FOR SELECT 
USING (true);

-- Only system/staff can insert badges (via edge function or admin)
CREATE POLICY "Staff can manage badges" 
ON public.badges FOR ALL 
TO authenticated
USING (public.is_staff(auth.uid()));

-- System can award badges (via edge function with service role)
CREATE POLICY "System can award badges" 
ON public.user_badges FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Insert default badges
-- Purchase badges
INSERT INTO public.badges (name, description, icon, color, category, requirement_type, requirement_value, display_order) VALUES
('First Purchase', 'Made your first purchase', 'ShoppingBag', 'emerald', 'purchase', 'order_count', 1, 1),
('Regular Shopper', 'Completed 5 orders', 'ShoppingCart', 'blue', 'purchase', 'order_count', 5, 2),
('Power Buyer', 'Completed 10 orders', 'Zap', 'purple', 'purchase', 'order_count', 10, 3),
('Big Spender', 'Spent $100 total', 'DollarSign', 'amber', 'purchase', 'total_spent', 100, 4),
('VIP Customer', 'Spent $500 total', 'Crown', 'yellow', 'purchase', 'total_spent', 500, 5);

-- Community badges
INSERT INTO public.badges (name, description, icon, color, category, requirement_type, requirement_value, display_order) VALUES
('First Post', 'Created your first forum post', 'MessageSquare', 'cyan', 'community', 'forum_posts', 1, 10),
('Active Contributor', 'Created 10 forum posts', 'MessagesSquare', 'teal', 'community', 'forum_posts', 10, 11),
('Community Leader', 'Created 50 forum posts', 'Users', 'indigo', 'community', 'forum_posts', 50, 12),
('Thread Starter', 'Started 5 forum threads', 'FileText', 'sky', 'community', 'forum_threads', 5, 13),
('Helpful Member', 'Had a reply marked as solution', 'CheckCircle', 'green', 'community', 'solutions', 1, 14);

-- Engagement badges
INSERT INTO public.badges (name, description, icon, color, category, requirement_type, requirement_value, display_order) VALUES
('First Review', 'Wrote your first review', 'Star', 'orange', 'engagement', 'reviews', 1, 20),
('Trusted Reviewer', 'Wrote 5 reviews', 'Stars', 'rose', 'engagement', 'reviews', 5, 21),
('Newcomer', 'Member for 1 month', 'UserPlus', 'slate', 'engagement', 'account_age_days', 30, 22),
('Veteran', 'Member for 6 months', 'Award', 'violet', 'engagement', 'account_age_days', 180, 23),
('Eclipse OG', 'Member for 1 year', 'Trophy', 'amber', 'engagement', 'account_age_days', 365, 24);

-- Create function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id UUID)
RETURNS SETOF public.user_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    badge_record RECORD;
    user_stat INTEGER;
    user_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user creation date
    SELECT created_at INTO user_created_at FROM auth.users WHERE id = _user_id;
    
    -- Loop through all badges
    FOR badge_record IN SELECT * FROM public.badges LOOP
        -- Skip if user already has this badge
        IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = _user_id AND badge_id = badge_record.id) THEN
            CONTINUE;
        END IF;
        
        -- Calculate the relevant stat based on requirement_type
        CASE badge_record.requirement_type
            WHEN 'order_count' THEN
                SELECT COUNT(*) INTO user_stat FROM public.orders WHERE user_id = _user_id AND status = 'completed';
            WHEN 'total_spent' THEN
                SELECT COALESCE(SUM(total), 0) INTO user_stat FROM public.orders WHERE user_id = _user_id AND status = 'completed';
            WHEN 'forum_posts' THEN
                SELECT COUNT(*) INTO user_stat FROM public.forum_posts WHERE user_id = _user_id;
            WHEN 'forum_threads' THEN
                SELECT COUNT(*) INTO user_stat FROM public.forum_threads WHERE user_id = _user_id;
            WHEN 'solutions' THEN
                SELECT COUNT(*) INTO user_stat FROM public.forum_posts WHERE user_id = _user_id AND is_solution = true;
            WHEN 'reviews' THEN
                SELECT COUNT(*) INTO user_stat FROM public.reviews WHERE user_id = _user_id AND is_approved = true;
            WHEN 'account_age_days' THEN
                SELECT EXTRACT(DAY FROM (now() - user_created_at)) INTO user_stat;
            ELSE
                user_stat := 0;
        END CASE;
        
        -- Award badge if threshold met
        IF user_stat >= badge_record.requirement_value THEN
            INSERT INTO public.user_badges (user_id, badge_id)
            VALUES (_user_id, badge_record.id)
            ON CONFLICT (user_id, badge_id) DO NOTHING
            RETURNING * INTO badge_record;
            
            IF FOUND THEN
                RETURN NEXT badge_record;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$;