
ALTER TABLE public.game_news_feeds
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS embed_color INTEGER DEFAULT 47316;

-- Update existing feeds with icons and colors
UPDATE public.game_news_feeds SET 
  icon_url = 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/global/logo_cs_sm.png',
  embed_color = 16750848
WHERE name = 'CS2';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Rockstar_Games_Logo.svg/1200px-Rockstar_Games_Logo.svg.png',
  embed_color = 16776960
WHERE name ILIKE '%rockstar%' OR name ILIKE '%GTA%';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://fortnite-api.com/assets/branding/icon.png',
  embed_color = 2849823
WHERE name ILIKE '%fortnite%';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/optimized/4X/3/4/e/34e3a04d95f8ed0e8f94a95f0e62c5be8a5c4c2c_2_180x180.png',
  embed_color = 47872
WHERE name ILIKE '%roblox%';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://media.contentapi.ea.com/content/dam/ea/ea-global-assets/ea-com-logos/ea_logo_2020_white.png',
  embed_color = 255
WHERE name ILIKE '%EA%';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
  embed_color = 1710618
WHERE name ILIKE '%github%';

UPDATE public.game_news_feeds SET 
  icon_url = 'https://unity.com/favicon.ico',
  embed_color = 2236962
WHERE name ILIKE '%unity%';
