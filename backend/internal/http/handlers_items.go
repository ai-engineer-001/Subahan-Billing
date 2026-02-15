package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"subahan-billing-backend/internal/store"
)

const cacheTTL = time.Hour

func (s *Server) handleListItems(w http.ResponseWriter, r *http.Request) {
	includeDeleted := strings.ToLower(r.URL.Query().Get("includeDeleted")) == "true"
	limit := 100
	offset := 0

	if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if v := strings.TrimSpace(r.URL.Query().Get("offset")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	cacheKey := "items:active"
	if includeDeleted {
		cacheKey = "items:all"
	}
	// Skip cache for paginated requests
	if offset == 0 && limit >= 100 {
		if cached, ok := s.Cache.Get(cacheKey); ok {
			writeJSON(w, http.StatusOK, cached)
			return
		}
	}

	items, err := s.Store.ListItems(r.Context(), includeDeleted, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load items")
		return
	}

	if offset == 0 && limit >= 100 {
		s.Cache.Set(cacheKey, items, cacheTTL)
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateItem(w http.ResponseWriter, r *http.Request) {
	var input store.ItemCreate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	normalizedID, err := validateItemID(input.ItemID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	input.ItemID = normalizedID
	if strings.TrimSpace(input.Name) == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(input.ArabicName) == "" {
		writeError(w, http.StatusBadRequest, "arabicName is required")
		return
	}

	// Validate based on Wire/Box mode
	if input.IsWireBox {
		// Wire/Box mode: base purchase price and percentages are required
		if input.BuyingPrice == nil || *input.BuyingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "buyingPrice (base purchase price) is required for Wire/Box items")
			return
		}
		if input.PurchasePercentage == nil || *input.PurchasePercentage < 0 || *input.PurchasePercentage > 100 {
			writeError(w, http.StatusBadRequest, "purchasePercentage must be between 0 and 100")
			return
		}
		if input.SellPercentage == nil || *input.SellPercentage < 0 || *input.SellPercentage > 100 {
			writeError(w, http.StatusBadRequest, "sellPercentage must be between 0 and 100")
			return
		}
		// Calculate selling price using discount percentages from base price
		// buyingPrice = base/reference price (e.g., 1.000 KWD)
		// Selling price = base × (1 - sell%) → e.g., 1.000 × (1 - 0.08) = 0.920 KWD
		// Actual purchase cost = base × (1 - purchase%) → e.g., 1.000 × (1 - 0.09) = 0.910 KWD
		// Profit = 0.920 - 0.910 = 0.010 KWD (1% of base)
		input.SellingPrice = *input.BuyingPrice * (1 - (*input.SellPercentage / 100))
	} else {
		// Normal mode: both prices are required
		if input.BuyingPrice == nil || *input.BuyingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "buyingPrice is required and must be positive")
			return
		}
		if input.SellingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "sellingPrice must be positive")
			return
		}
		// Clear percentage fields for normal items
		input.PurchasePercentage = nil
		input.SellPercentage = nil
	}

	if strings.TrimSpace(input.Unit) == "" {
		input.Unit = "pcs"
	}

	item, err := s.Store.CreateItem(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create item")
		return
	}

	s.Cache.Invalidate("items:")
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) handleUpdateItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	var input store.ItemCreate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	input.ItemID = itemID
	if strings.TrimSpace(input.Name) == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(input.ArabicName) == "" {
		writeError(w, http.StatusBadRequest, "arabicName is required")
		return
	}

	// Validate based on Wire/Box mode
	if input.IsWireBox {
		// Wire/Box mode: base purchase price and percentages are required
		if input.BuyingPrice == nil || *input.BuyingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "buyingPrice (base purchase price) is required for Wire/Box items")
			return
		}
		if input.PurchasePercentage == nil || *input.PurchasePercentage < 0 || *input.PurchasePercentage > 100 {
			writeError(w, http.StatusBadRequest, "purchasePercentage must be between 0 and 100")
			return
		}
		if input.SellPercentage == nil || *input.SellPercentage < 0 || *input.SellPercentage > 100 {
			writeError(w, http.StatusBadRequest, "sellPercentage must be between 0 and 100")
			return
		}
		// Calculate selling price using discount percentages from base price
		// buyingPrice = base/reference price (e.g., 1.000 KWD)
		// Selling price = base × (1 - sell%) → e.g., 1.000 × (1 - 0.08) = 0.920 KWD
		// Actual purchase cost = base × (1 - purchase%) → e.g., 1.000 × (1 - 0.09) = 0.910 KWD
		// Profit = 0.920 - 0.910 = 0.010 KWD (1% of base)
		input.SellingPrice = *input.BuyingPrice * (1 - (*input.SellPercentage / 100))
	} else {
		// Normal mode: both prices are required
		if input.BuyingPrice == nil || *input.BuyingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "buyingPrice is required and must be positive")
			return
		}
		if input.SellingPrice <= 0 {
			writeError(w, http.StatusBadRequest, "sellingPrice must be positive")
			return
		}
		// Clear percentage fields for normal items
		input.PurchasePercentage = nil
		input.SellPercentage = nil
	}

	item, err := s.Store.UpdateItem(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	s.Cache.Invalidate("items:")
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) handleGetItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	item, err := s.Store.GetItem(r.Context(), itemID)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) handleDeleteItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	if err := s.Store.SoftDeleteItem(r.Context(), itemID); err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	s.Cache.Invalidate("items:")
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleRestoreItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	if err := s.Store.RestoreItem(r.Context(), itemID); err != nil {
		writeError(w, http.StatusConflict, "restore window expired or item not found")
		return
	}

	s.Cache.Invalidate("items:")
	writeJSON(w, http.StatusOK, map[string]string{"status": "restored"})
}

func validateItemID(itemID string) (string, error) {
	trimmed := strings.TrimSpace(itemID)
	if trimmed == "" {
		return "", errors.New("itemId is required")
	}
	if len(trimmed) > 100 {
		return "", errors.New("itemId must be at most 100 characters")
	}
	for _, ch := range trimmed {
		if (ch < '0' || ch > '9') && (ch < 'A' || ch > 'Z') && (ch < 'a' || ch > 'z') {
			return "", errors.New("itemId must contain only letters and numbers")
		}
	}
	return trimmed, nil
}
