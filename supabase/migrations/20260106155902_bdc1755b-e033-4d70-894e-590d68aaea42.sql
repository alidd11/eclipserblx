-- Add rules column to forum_categories
ALTER TABLE public.forum_categories 
ADD COLUMN rules TEXT;

-- Update categories with default rules
UPDATE public.forum_categories 
SET rules = 'Welcome to Announcements! This channel is for official news and updates from the Eclipse team. Only administrators can create posts here. Please read all announcements carefully.'
WHERE slug = 'announcements';

UPDATE public.forum_categories 
SET rules = '1. Be respectful to all community members
2. Stay on topic - Roblox UK roleplay discussions only
3. No spam, advertising, or self-promotion
4. Use appropriate language
5. No sharing of exploits or cheats
6. Have fun and help others!'
WHERE slug = 'general';

UPDATE public.forum_categories 
SET rules = '1. Search before requesting - check if it already exists
2. Be specific about what you need (include references/images if possible)
3. One request per thread
4. Be patient - our team works hard to fulfill requests
5. No duplicate requests'
WHERE slug = 'requests';

UPDATE public.forum_categories 
SET rules = '1. Only share your own creations
2. Give credit if you used Eclipse assets
3. Constructive feedback only
4. No NSFW or inappropriate content
5. Include a brief description of your creation'
WHERE slug = 'showcase';

UPDATE public.forum_categories 
SET rules = '1. Search for existing solutions before posting
2. Provide your order ID or transaction details (mask sensitive info)
3. Be detailed - describe the issue clearly
4. Be patient - support team will respond within 24 hours
5. One issue per thread'
WHERE slug = 'support';