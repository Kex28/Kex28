"""Data pipeline for the SWU Meta Tracker.

Pulls tournament-meta data from api.swuapi.com and lands it, raw, in
Supabase. Phase 1 covers the open (keyless) endpoints only: sets, cards,
archetypes, and the current-meta list.
"""
