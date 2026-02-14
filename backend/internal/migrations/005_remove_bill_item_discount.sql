-- Remove obsolete discount support from persisted bill items
ALTER TABLE bill_items
    DROP COLUMN IF EXISTS base_selling_price;