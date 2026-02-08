package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"subahan-billing-backend/internal/cache"
	"subahan-billing-backend/internal/config"
	"subahan-billing-backend/internal/store"
)

type Server struct {
	Config *config.Config
	Store  *store.Store
	Cache  *cache.Cache
}

func NewServer(cfg *config.Config, store *store.Store, cache *cache.Cache) *Server {
	return &Server{Config: cfg, Store: store, Cache: cache}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	if s.Config.CORSOrigin != "" {
		r.Use(corsMiddleware(s.Config.CORSOrigin))
	}
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Route("/api", func(api chi.Router) {
		api.Post("/auth/login", s.handleLogin)

		api.Group(func(protected chi.Router) {
			protected.Use(s.authMiddleware)
			protected.Get("/items", s.handleListItems)
			protected.Get("/items/{itemId}", s.handleGetItem)
			protected.Post("/items", s.handleCreateItem)
			protected.Put("/items/{itemId}", s.handleUpdateItem)
			protected.Delete("/items/{itemId}", s.handleDeleteItem)
			protected.Post("/items/{itemId}/restore", s.handleRestoreItem)

			protected.Get("/bills", s.handleListBills)
			protected.Post("/bills", s.handleCreateBill)
			protected.Get("/bills/{billId}", s.handleGetBill)
			protected.Delete("/bills/{billId}", s.handleDeleteBill)
		})
	})

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return r
}
