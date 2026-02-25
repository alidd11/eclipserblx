
-- Add columns for game pass mirroring and screenshot comparison results
ALTER TABLE public.ip_copy_detections
ADD COLUMN IF NOT EXISTS game_pass_match_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS screenshot_comparison_data jsonb DEFAULT NULL;

-- game_pass_match_data will store: { matched_passes: [{original_name, copy_name, similarity, original_price, copy_price}], match_score: number, total_original: number, total_copy: number }
-- screenshot_comparison_data will store: { comparisons: [{original_url, copy_url, is_similar, confidence, reasoning}], overall_score: number }
