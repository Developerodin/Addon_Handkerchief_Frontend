export type SignOffColumn = 'developed' | 'testedOdin' | 'testedAddon' | 'implemented';

export type LogColumn = SignOffColumn | 'developer' | 'addon';

export interface CheckpointItem {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  sortOrder: number;
  developedChecked: boolean;
  developedCheckedByName: string;
  developedCheckedAt: string | null;
  testedOdinChecked: boolean;
  testedOdinCheckedByName: string;
  testedOdinCheckedAt: string | null;
  testedAddonChecked: boolean;
  testedAddonCheckedByName: string;
  testedAddonCheckedAt: string | null;
  implemented: boolean | null;
  implementedByName: string;
  implementedAt: string | null;
  pendencyRemark: string;
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
  column: LogColumn;
  checked: boolean;
  userName: string;
  actedAt: string;
}

export interface CheckpointListResponse {
  modules: CheckpointModule[];
}
