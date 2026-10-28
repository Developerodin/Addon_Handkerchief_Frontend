export type SignOffColumn = 'developer' | 'addon';

export interface CheckpointItem {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  sortOrder: number;
  developerChecked: boolean;
  developerCheckedByName: string;
  developerCheckedAt: string | null;
  addonChecked: boolean;
  addonCheckedByName: string;
  addonCheckedAt: string | null;
  complete: boolean;
}

export interface CheckpointModule {
  id: string;
  name: string;
  sortOrder: number;
  complete: boolean;
  items: CheckpointItem[];
}

export interface CheckpointLog {
  id: string;
  itemId: string;
  moduleId: string;
  column: SignOffColumn;
  checked: boolean;
  userName: string;
  actedAt: string;
}

export interface CheckpointListResponse {
  modules: CheckpointModule[];
}
