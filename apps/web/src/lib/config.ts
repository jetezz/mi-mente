// Centralized Configuration
// This picks up PUBLIC_API_URL from .env (build time) or falls back to local proxy

export const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4321/api';
