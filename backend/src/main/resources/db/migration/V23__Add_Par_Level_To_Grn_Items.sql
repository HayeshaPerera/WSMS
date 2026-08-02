-- Add par_level column to grn_items table to store reorder threshold
ALTER TABLE grn_items ADD COLUMN IF NOT EXISTS par_level INT DEFAULT 20;
