-- Update store items with duration metadata
UPDATE store_items SET metadata = '{"duration_days": 1}'::jsonb WHERE icon = 'boost_24';
UPDATE store_items SET metadata = '{"duration_days": 7}'::jsonb WHERE icon = 'boost_7d';
UPDATE store_items SET metadata = '{"duration_days": 1}'::jsonb WHERE icon = 'spotlight';
UPDATE store_items SET metadata = '{"duration_days": 30}'::jsonb WHERE icon = 'frame_gold';
UPDATE store_items SET metadata = '{"duration_days": 30}'::jsonb WHERE icon = 'frame_neon';
UPDATE store_items SET metadata = '{"duration_days": 30}'::jsonb WHERE icon = 'rainbow';
UPDATE store_items SET metadata = '{"duration_days": 30}'::jsonb WHERE icon = 'custom_badge';
UPDATE store_items SET metadata = '{"duration_days": 90}'::jsonb WHERE icon = 'verified';

-- Update existing purchases that have no expiry to get proper expiry based on item duration
UPDATE store_purchases sp SET expires_at = sp.created_at + (
  CASE 
    WHEN si.icon = 'boost_24' THEN interval '1 day'
    WHEN si.icon = 'boost_7d' THEN interval '7 days'
    WHEN si.icon = 'spotlight' THEN interval '1 day'
    WHEN si.icon = 'frame_gold' THEN interval '30 days'
    WHEN si.icon = 'frame_neon' THEN interval '30 days'
    WHEN si.icon = 'rainbow' THEN interval '30 days'
    WHEN si.icon = 'custom_badge' THEN interval '30 days'
    WHEN si.icon = 'verified' THEN interval '90 days'
    ELSE interval '30 days'
  END
)
FROM store_items si
WHERE sp.item_id = si.id AND sp.expires_at IS NULL;