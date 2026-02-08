package store

import "time"

type Item struct {
	ItemID       string     `json:"itemId"`
	Name         string     `json:"name"`
	BuyingPrice  *float64   `json:"buyingPrice"`
	SellingPrice float64    `json:"sellingPrice"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	DeletedAt    *time.Time `json:"deletedAt"`
}

type ItemCreate struct {
	ItemID       string   `json:"itemId"`
	Name         string   `json:"name"`
	BuyingPrice  *float64 `json:"buyingPrice"`
	SellingPrice float64  `json:"sellingPrice"`
}

type Bill struct {
	ID          string     `json:"id"`
	Customer    *string    `json:"customer"`
	TotalAmount float64    `json:"totalAmount"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Items       []BillItem `json:"items"`
}

type BillItem struct {
	ID               string  `json:"id"`
	BillID           string  `json:"billId"`
	ItemID           string  `json:"itemId"`
	ItemName         string  `json:"itemName"`
	Quantity         int     `json:"quantity"`
	UnitPrice        float64 `json:"unitPrice"`
	BaseSellingPrice float64 `json:"baseSellingPrice"`
}

type BillItemCreate struct {
	ItemID    string   `json:"itemId"`
	Quantity  int      `json:"quantity"`
	UnitPrice *float64 `json:"unitPrice"`
}

type BillCreate struct {
	Customer *string          `json:"customer"`
	Items    []BillItemCreate `json:"items"`
}
