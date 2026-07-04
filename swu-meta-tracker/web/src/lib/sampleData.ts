import type { MetaSnapshot } from "./types";

/* Bundled sample data, mirroring pipeline/swu_pipeline/fixtures/.
   Shown (with a "sample data" notice) when no Supabase project is
   configured, so the UI is inspectable without any backend. */

const rows: [string, string, string, string, string, number, number, number, number][] = [
  ["sabine-ecl", "Sabine Aggro", "Sabine Wren", "Energy Conversion Lab", "Aggression", 0.148, 0.545, 212, 1874],
  ["boba-red", "Boba Yellow-Red", "Boba Fett", "Jabba's Palace", "Cunning", 0.131, 0.538, 188, 1702],
  ["iden-blue", "Iden Control", "Iden Versio", "Security Complex", "Vigilance", 0.104, 0.512, 149, 1355],
  ["vader-command", "Vader Midrange", "Darth Vader", "Command Center", "Command", 0.093, 0.507, 133, 1189],
  ["han-green", "Han Ramp", "Han Solo", "Echo Base", "Command", 0.082, 0.529, 118, 1046],
  ["luke-blue", "Luke Tempo", "Luke Skywalker", "Administrator's Tower", "Vigilance", 0.067, 0.498, 96, 851],
  ["palpatine-red", "Palpatine Aggro", "Emperor Palpatine", "Kestro City", "Aggression", 0.055, 0.489, 79, 707],
  ["kylo-yellow", "Kylo Tricks", "Kylo Ren", "Coronet City", "Cunning", 0.043, 0.521, 62, 548],
  ["rey-mill", "Rey Toolbox", "Rey", "Dagobah Swamp", "Command", 0.031, 0.476, 44, 391],
  ["quinlan-green", "Quinlan Tempo", "Quinlan Vos", "Chopper Base", "Command", 0.024, 0.553, 34, 302],
];

export const sampleSnapshot: MetaSnapshot = {
  capturedAt: "2026-07-01T06:00:00Z",
  sourceWindow: "last-30-days",
  lastSyncAt: "2026-07-01T06:04:12Z",
  demo: true,
  rows: rows.map(([id, name, leader, base, aspect, metaShare, winRate, deckCount, matchCount]) => ({
    archetype: { id, name, leader, base, aspect },
    metaShare,
    winRate,
    deckCount,
    matchCount,
  })),
};
