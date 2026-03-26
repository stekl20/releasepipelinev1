export interface Release {
  id: string;
  act: string;
  title: string;
  date: string; // ISO date string
  approved: boolean;
  distributed: boolean;
}

export interface StoredState {
  lastImport: string;
  releases: Release[];
}
