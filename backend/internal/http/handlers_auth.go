package http

import (
	"encoding/json"
	"net/http"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if req.Username != s.Config.AdminUser || req.Password != s.Config.AdminPass {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := issueToken(s.Config.JWTSecret, req.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "unable to issue token")
		return
	}

	writeJSON(w, http.StatusOK, loginResponse{Token: token})
}
