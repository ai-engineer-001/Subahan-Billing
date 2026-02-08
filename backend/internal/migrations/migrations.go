package migrations

import (
	"context"
	_ "embed"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed 001_init.sql
var initSQL string

func Run(ctx context.Context, pool *pgxpool.Pool) error {
	log.Println("Running database migrations...")
	
	if _, err := pool.Exec(ctx, initSQL); err != nil {
		return err
	}
	
	log.Println("Database migrations completed successfully")
	return nil
}
