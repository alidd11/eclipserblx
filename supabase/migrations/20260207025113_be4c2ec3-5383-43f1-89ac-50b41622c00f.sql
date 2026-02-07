-- Create table to track active multiplayer games
CREATE TABLE public.discord_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL, -- 'duel', 'tictactoe', 'connect4', 'hangman', 'trivia', 'heist', 'boss'
  channel_id TEXT NOT NULL,
  guild_id TEXT,
  message_id TEXT, -- Discord message ID for updating
  creator_discord_id TEXT NOT NULL,
  creator_username TEXT NOT NULL,
  opponent_discord_id TEXT,
  opponent_username TEXT,
  game_state JSONB NOT NULL DEFAULT '{}', -- Flexible state storage
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'expired'
  winner_discord_id TEXT,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS
ALTER TABLE public.discord_games ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage games"
ON public.discord_games
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_discord_games_channel ON public.discord_games(channel_id, status);
CREATE INDEX idx_discord_games_message ON public.discord_games(message_id);
CREATE INDEX idx_discord_games_creator ON public.discord_games(creator_discord_id);

-- Trivia questions table
CREATE TABLE public.discord_trivia_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  wrong_answers TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_trivia_questions ENABLE ROW LEVEL SECURITY;

-- Allow reading for everyone (questions are public)
CREATE POLICY "Anyone can read trivia questions"
ON public.discord_trivia_questions
FOR SELECT
USING (true);

-- Insert sample trivia questions
INSERT INTO public.discord_trivia_questions (category, difficulty, question, correct_answer, wrong_answers) VALUES
('Gaming', 'easy', 'What year was Roblox released?', '2006', ARRAY['2004', '2008', '2010']),
('Gaming', 'medium', 'What programming language is used to script in Roblox?', 'Lua', ARRAY['Python', 'JavaScript', 'C++']),
('Gaming', 'hard', 'What was the original name of Roblox?', 'DynaBlocks', ARRAY['BlockWorld', 'RoBlocks', 'BuilderBeta']),
('Gaming', 'easy', 'What is the in-game currency in Roblox called?', 'Robux', ARRAY['Coins', 'Gems', 'Tickets']),
('Gaming', 'medium', 'What year did Roblox remove Tickets (Tix)?', '2016', ARRAY['2014', '2015', '2017']),
('General', 'easy', 'What planet is known as the Red Planet?', 'Mars', ARRAY['Venus', 'Jupiter', 'Saturn']),
('General', 'medium', 'What is the chemical symbol for gold?', 'Au', ARRAY['Ag', 'Fe', 'Go']),
('General', 'hard', 'In what year did the Berlin Wall fall?', '1989', ARRAY['1987', '1991', '1985']),
('General', 'easy', 'How many continents are there?', '7', ARRAY['5', '6', '8']),
('General', 'medium', 'What is the largest ocean on Earth?', 'Pacific Ocean', ARRAY['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean']),
('Tech', 'easy', 'What does CPU stand for?', 'Central Processing Unit', ARRAY['Computer Personal Unit', 'Central Program Unit', 'Core Processing Unit']),
('Tech', 'medium', 'Who founded Discord?', 'Jason Citron', ARRAY['Mark Zuckerberg', 'Elon Musk', 'Jack Dorsey']),
('Tech', 'hard', 'What year was Discord launched?', '2015', ARRAY['2013', '2016', '2014']),
('Tech', 'easy', 'What does HTML stand for?', 'HyperText Markup Language', ARRAY['HighText Machine Language', 'HyperText Machine Language', 'HighText Markup Language']),
('Tech', 'medium', 'What programming language was created by Brendan Eich in 10 days?', 'JavaScript', ARRAY['Python', 'Java', 'Ruby']);