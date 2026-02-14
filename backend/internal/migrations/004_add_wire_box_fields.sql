-- Add fields for Wire/Box mode with percentage-based pricing
ALTER TABLE items 
    ADD COLUMN IF NOT EXISTS is_wire_box BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS purchase_percentage NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS sell_percentage NUMERIC(5, 2);

-- Add check constraints for percentages (0-100 range) only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_purchase_percentage') THEN
        ALTER TABLE items
            ADD CONSTRAINT check_purchase_percentage CHECK (purchase_percentage IS NULL OR (purchase_percentage >= 0 AND purchase_percentage <= 100));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_sell_percentage') THEN
        ALTER TABLE items
            ADD CONSTRAINT check_sell_percentage CHECK (sell_percentage IS NULL OR (sell_percentage >= 0 AND sell_percentage <= 100));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_wire_box_pricing') THEN
        ALTER TABLE items
            ADD CONSTRAINT check_wire_box_pricing CHECK (
                (is_wire_box = TRUE AND buying_price IS NOT NULL AND purchase_percentage IS NOT NULL AND sell_percentage IS NOT NULL) OR
                (is_wire_box = FALSE AND buying_price IS NOT NULL AND selling_price IS NOT NULL)
            );
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_items_is_wire_box ON items (is_wire_box);
