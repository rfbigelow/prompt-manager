export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  createdAt: Date;
  createdBy?: string;
  changeDescription?: string;
  metadata?: Record<string, unknown>;
}

export interface Prompt {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  currentVersionId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface PromptWithVersion extends Prompt {
  currentVersion: PromptVersion;
  versions?: PromptVersion[];
}

export interface PromptCreateInput {
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  changeDescription?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface PromptUpdateInput {
  name?: string;
  description?: string;
  content?: string;
  tags?: string[];
  changeDescription?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface VersionComparisonResult {
  promptId: string;
  fromVersion: PromptVersion;
  toVersion: PromptVersion;
  changes: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}