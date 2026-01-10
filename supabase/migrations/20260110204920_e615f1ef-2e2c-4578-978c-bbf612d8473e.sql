-- Fix the check_and_award_badges function to recognize 'paid' status for orders
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
                -- Count orders with 'paid' or 'completed' status
                SELECT COUNT(*) INTO user_stat FROM public.orders WHERE user_id = _user_id AND status IN ('paid', 'completed');
            WHEN 'total_spent' THEN
                -- Sum total from orders with 'paid' or 'completed' status
                SELECT COALESCE(SUM(total), 0) INTO user_stat FROM public.orders WHERE user_id = _user_id AND status IN ('paid', 'completed');
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