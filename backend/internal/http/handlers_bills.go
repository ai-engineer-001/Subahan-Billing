package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"subahan-billing-backend/internal/store"
)

func (s *Server) handleCreateBill(w http.ResponseWriter, r *http.Request) {
	var input store.BillCreate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if len(input.Items) == 0 {
		writeError(w, http.StatusBadRequest, "bill items are required")
		return
	}

	bill, err := s.Store.CreateBill(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, bill)
}

func (s *Server) handleListBills(w http.ResponseWriter, r *http.Request) {
	limit := 50
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

	bills, err := s.Store.ListBills(r.Context(), limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list bills")
		return
	}
	writeJSON(w, http.StatusOK, bills)
}

func (s *Server) handleGetBill(w http.ResponseWriter, r *http.Request) {
	billID := chi.URLParam(r, "billId")
	bill, err := s.Store.GetBill(r.Context(), billID)
	if err != nil {
		writeError(w, http.StatusNotFound, "bill not found")
		return
	}
	writeJSON(w, http.StatusOK, bill)
}

func (s *Server) handleUpdateBill(w http.ResponseWriter, r *http.Request) {
	billID := chi.URLParam(r, "billId")
	var input store.BillCreate
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if len(input.Items) == 0 {
		writeError(w, http.StatusBadRequest, "bill items are required")
		return
	}

	bill, err := s.Store.UpdateBill(r.Context(), billID, input)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "bill or item not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, bill)
}

func (s *Server) handleDeleteBill(w http.ResponseWriter, r *http.Request) {
	billID := chi.URLParam(r, "billId")
	if err := s.Store.DeleteBill(r.Context(), billID); err != nil {
		if err == store.ErrNotFound {
			writeError(w, http.StatusNotFound, "bill not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete bill")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
