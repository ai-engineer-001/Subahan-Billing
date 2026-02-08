package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

const cleanupWindow = 24 * time.Hour

type Store struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) ListItems(ctx context.Context, includeDeleted bool) ([]Item, error) {
	query := "SELECT item_id, name, buying_price, selling_price, unit, created_at, updated_at, deleted_at FROM items"
	if !includeDeleted {
		query += " WHERE deleted_at IS NULL"
	}
	query += " ORDER BY name"

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ItemID, &item.Name, &item.BuyingPrice, &item.SellingPrice, &item.Unit, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetItem(ctx context.Context, itemID string) (Item, error) {
	var item Item
	row := s.db.QueryRow(ctx, "SELECT item_id, name, buying_price, selling_price, unit, created_at, updated_at, deleted_at FROM items WHERE item_id=$1", itemID)
	if err := row.Scan(&item.ItemID, &item.Name, &item.BuyingPrice, &item.SellingPrice, &item.Unit, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt); err != nil {
		return item, ErrNotFound
	}
	return item, nil
}

func (s *Store) CreateItem(ctx context.Context, input ItemCreate) (Item, error) {
	var item Item
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return item, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(421987)"); err != nil {
		return item, err
	}

	if _, err := tx.Exec(ctx, "DELETE FROM items WHERE deleted_at < now() - interval '1 day'"); err != nil {
		return item, err
	}

	itemID := strings.TrimSpace(input.ItemID)
	if itemID == "" {
		nextID, err := nextItemID(ctx, tx)
		if err != nil {
			return item, err
		}
		itemID = nextID
	}

	unit := strings.TrimSpace(input.Unit)
	if unit == "" {
		unit = "pcs"
	}
	row := tx.QueryRow(ctx,
		"INSERT INTO items (item_id, name, buying_price, selling_price, unit) VALUES ($1, $2, $3, $4, $5) RETURNING item_id, name, buying_price, selling_price, unit, created_at, updated_at, deleted_at",
		itemID, input.Name, input.BuyingPrice, input.SellingPrice, unit,
	)
	if err := row.Scan(&item.ItemID, &item.Name, &item.BuyingPrice, &item.SellingPrice, &item.Unit, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt); err != nil {
		return item, err
	}

	if err := tx.Commit(ctx); err != nil {
		return item, err
	}

	return item, nil
}

func nextItemID(ctx context.Context, tx pgx.Tx) (string, error) {
	var nextNumber int
	query := `
		WITH existing AS (
			SELECT CAST(SUBSTRING(item_id FROM 5) AS INT) AS num
			FROM items
			WHERE item_id LIKE 'ITEM%'
				AND LENGTH(item_id) = 7
				AND (deleted_at IS NULL OR deleted_at >= now() - interval '1 day')
		),
		maxnum AS (
			SELECT COALESCE(MAX(num), 0) AS maxnum FROM existing
		),
		series AS (
			SELECT generate_series(1, (SELECT maxnum + 1 FROM maxnum)) AS num
		)
		SELECT s.num
		FROM series s
		LEFT JOIN existing e ON e.num = s.num
		WHERE e.num IS NULL
		ORDER BY s.num
		LIMIT 1;
	`

	if err := tx.QueryRow(ctx, query).Scan(&nextNumber); err != nil {
		return "", err
	}

	return fmt.Sprintf("ITEM%03d", nextNumber), nil
}

func (s *Store) UpdateItem(ctx context.Context, input ItemCreate) (Item, error) {
	var item Item
	row := s.db.QueryRow(ctx,
		"UPDATE items SET name=$2, buying_price=$3, selling_price=$4, unit=$5, updated_at=now() WHERE item_id=$1 AND deleted_at IS NULL RETURNING item_id, name, buying_price, selling_price, unit, created_at, updated_at, deleted_at",
		input.ItemID, input.Name, input.BuyingPrice, input.SellingPrice, input.Unit,
	)
	if err := row.Scan(&item.ItemID, &item.Name, &item.BuyingPrice, &item.SellingPrice, &item.Unit, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt); err != nil {
		return item, ErrNotFound
	}
	return item, nil
}

func (s *Store) SoftDeleteItem(ctx context.Context, itemID string) error {
	cmd, err := s.db.Exec(ctx, "UPDATE items SET deleted_at=now(), updated_at=now() WHERE item_id=$1 AND deleted_at IS NULL", itemID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) RestoreItem(ctx context.Context, itemID string) error {
	cmd, err := s.db.Exec(ctx, "UPDATE items SET deleted_at=NULL, updated_at=now() WHERE item_id=$1 AND deleted_at >= now() - interval '1 day'", itemID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) CleanupDeletedItems(ctx context.Context) error {
	_, err := s.db.Exec(ctx, "DELETE FROM items WHERE deleted_at < now() - interval '1 day'")
	return err
}

func (s *Store) CreateBill(ctx context.Context, input BillCreate) (Bill, error) {
	bill := Bill{}
	if len(input.Items) == 0 {
		return bill, errors.New("bill has no items")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return bill, err
	}
	defer tx.Rollback(ctx)

	items := []BillItem{}
	var total float64

	for _, line := range input.Items {
		if line.Quantity <= 0 {
			return bill, errors.New("quantity must be positive")
		}

		var itemID, name string
		var sellingPrice float64
		row := tx.QueryRow(ctx, "SELECT item_id, name, selling_price FROM items WHERE item_id=$1 AND deleted_at IS NULL", line.ItemID)
		if err := row.Scan(&itemID, &name, &sellingPrice); err != nil {
			return bill, ErrNotFound
		}

		unitPrice := sellingPrice
		if line.UnitPrice != nil {
			unitPrice = *line.UnitPrice
		}

		lineTotal := unitPrice * float64(line.Quantity)
		total += lineTotal

		items = append(items, BillItem{
			ItemID:           itemID,
			ItemName:         name,
			Quantity:         line.Quantity,
			UnitPrice:        unitPrice,
			BaseSellingPrice: sellingPrice,
		})
	}

	row := tx.QueryRow(ctx, "INSERT INTO bills (customer_name, total_amount) VALUES ($1, $2) RETURNING id, customer_name, total_amount, created_at, updated_at", input.Customer, total)
	if err := row.Scan(&bill.ID, &bill.Customer, &bill.TotalAmount, &bill.CreatedAt, &bill.UpdatedAt); err != nil {
		return bill, err
	}

	for i := range items {
		row := tx.QueryRow(ctx, "INSERT INTO bill_items (bill_id, item_id, item_name, quantity, unit_price, base_selling_price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", bill.ID, items[i].ItemID, items[i].ItemName, items[i].Quantity, items[i].UnitPrice, items[i].BaseSellingPrice)
		if err := row.Scan(&items[i].ID); err != nil {
			return bill, err
		}
		items[i].BillID = bill.ID
	}

	bill.Items = items

	if err := tx.Commit(ctx); err != nil {
		return bill, err
	}

	return bill, nil
}

func (s *Store) ListBills(ctx context.Context, limit int) ([]Bill, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(ctx, "SELECT id, customer_name, total_amount, created_at, updated_at FROM bills ORDER BY created_at DESC LIMIT $1", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bills := []Bill{}
	for rows.Next() {
		var bill Bill
		if err := rows.Scan(&bill.ID, &bill.Customer, &bill.TotalAmount, &bill.CreatedAt, &bill.UpdatedAt); err != nil {
			return nil, err
		}
		bills = append(bills, bill)
	}
	return bills, rows.Err()
}

func (s *Store) GetBill(ctx context.Context, billID string) (Bill, error) {
	var bill Bill
	row := s.db.QueryRow(ctx, "SELECT id, customer_name, total_amount, created_at, updated_at FROM bills WHERE id=$1", billID)
	if err := row.Scan(&bill.ID, &bill.Customer, &bill.TotalAmount, &bill.CreatedAt, &bill.UpdatedAt); err != nil {
		return bill, ErrNotFound
	}

	rows, err := s.db.Query(ctx, `
		SELECT bi.id, bi.bill_id, bi.item_id, bi.item_name, 
		       COALESCE(i.unit, 'pcs') as unit,
		       bi.quantity, bi.unit_price, bi.base_selling_price 
		FROM bill_items bi
		LEFT JOIN items i ON bi.item_id = i.item_id
		WHERE bi.bill_id=$1 
		ORDER BY bi.item_name
	`, billID)
	if err != nil {
		return bill, err
	}
	defer rows.Close()

	items := []BillItem{}
	for rows.Next() {
		var item BillItem
		if err := rows.Scan(&item.ID, &item.BillID, &item.ItemID, &item.ItemName, &item.Unit, &item.Quantity, &item.UnitPrice, &item.BaseSellingPrice); err != nil {
			return bill, err
		}
		items = append(items, item)
	}
	bill.Items = items
	return bill, rows.Err()
}

func (s *Store) DeleteBill(ctx context.Context, billID string) error {
	cmd, err := s.db.Exec(ctx, "DELETE FROM bills WHERE id=$1", billID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
