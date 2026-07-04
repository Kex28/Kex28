export interface Archetype {
  id: string;
  name: string;
  leader: string;
  base: string;
  aspect: string | null;
}

export interface MetaRow {
  archetype: Archetype;
  metaShare: number; // 0..1
  winRate: number | null; // 0..1
  deckCount: number | null;
  matchCount: number | null;
}

export interface MetaSnapshot {
  capturedAt: string; // ISO timestamp of the meta pull
  sourceWindow: string | null;
  lastSyncAt: string | null; // when the pipeline last wrote data
  demo: boolean; // true when showing bundled sample data
  rows: MetaRow[];
}
