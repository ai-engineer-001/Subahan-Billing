package http

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"subahan-billing-backend/internal/store"
)

const cacheTTL = time.Hour

func (s *Server) handleListItems(w http.ResponseWriter, r *http.Request) {
	includeDeleted := strings.ToLower(r.URL.Query().Get("includeDeleted")) == "true"
	cacheKey := "items:active"
	if includeDeleted {
		cacheKey = "items:all"
	}

	if cached, ok := s.Cache.Get(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}

	items, err := s.Store.ListItems(r.Context(), includeDeleted)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load items")
		return
	}

	s.Cache.Set(cacheKey, items, cacheTTL)
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateItem(w http.ResponseWriter, r *http.Request) {
	var input store.ItemCreate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if strings.TrimSpace(input.ItemID) == "" || strings.TrimSpace(input.Name) == "" {
		writeError(w, http.StatusBadRequest, "itemId and name are required")
		return
	}
	if input.SellingPrice <= 0 {
		writeError(w, http.StatusBadRequest, "sellingPrice must be positive")
		return
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
	if input.SellingPrice <= 0 {
		writeError(w, http.StatusBadRequest, "sellingPrice must be positive")
		return
	}

	item, err := s.Store.UpdateItem(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	s.Cache.Invalidate("items:")
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
