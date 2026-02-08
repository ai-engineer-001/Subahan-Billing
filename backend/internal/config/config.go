package config

import (
	"errors"
	"os"
)

type Config struct {
	DatabaseURL string
	Port        string
	JWTSecret   string
	AdminUser   string
	AdminPass   string
	CORSOrigin  string
}

func Load() (Config, error) {
	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		AdminUser:   os.Getenv("ADMIN_USERNAME"),
		AdminPass:   os.Getenv("ADMIN_PASSWORD"),
		CORSOrigin:  os.Getenv("CORS_ORIGIN"),
	}

	if cfg.DatabaseURL == "" {
		return cfg, errors.New("DATABASE_URL is required")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.JWTSecret == "" {
		return cfg, errors.New("JWT_SECRET is required")
	}
	if cfg.AdminUser == "" || cfg.AdminPass == "" {
		return cfg, errors.New("ADMIN_USERNAME and ADMIN_PASSWORD are required")
	}
	if cfg.CORSOrigin == "" {
		cfg.CORSOrigin = "*"
	}

	return cfg, nil
}
