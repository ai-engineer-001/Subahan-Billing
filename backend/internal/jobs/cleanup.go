package jobs

import (
	"context"
	"log"
	"time"

	"subahan-billing-backend/internal/store"
)

func StartItemCleanup(ctx context.Context, store *store.Store) {
	ticker := time.NewTicker(time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				if err := store.CleanupDeletedItems(ctx); err != nil {
					log.Printf("cleanup failed: %v", err)
				}
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}
