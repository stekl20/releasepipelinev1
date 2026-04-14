export interface Release {
  id: string;
  act: string;
  title: string;
  date: string; // ISO date string
  approved: boolean;
  distributed: boolean;
  cover_done?: boolean;
}

export interface StoredState {
  lastImport: string;
  releases: Release[];
}

export interface CreditRow {
  id?: string;
  release_id: string;
  pseudo?: string;
  producer?: string;
  lyrics?: string;
  mastered?: string;
  cover_art?: string;
}
