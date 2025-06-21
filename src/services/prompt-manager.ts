import { StorageService } from "./storage.ts";
import {
  Prompt,
  PromptVersion,
  PromptWithVersion,
  PromptCreateInput,
  PromptUpdateInput,
  VersionComparisonResult,
} from "../models/prompt.ts";

export class PromptManager {
  constructor(private storage: StorageService) {}

  async createPrompt(input: PromptCreateInput): Promise<PromptWithVersion> {
    await this.storage.init();

    const promptId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();

    const version: PromptVersion = {
      id: versionId,
      promptId,
      version: 1,
      content: input.content,
      createdAt: now,
      createdBy: input.createdBy,
      changeDescription: input.changeDescription || "Initial version",
      metadata: input.metadata,
    };

    const prompt: Prompt = {
      id: promptId,
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    await this.storage.saveVersion(version);
    await this.storage.savePrompt(prompt);

    return {
      ...prompt,
      currentVersion: version,
    };
  }

  async updatePrompt(id: string, input: PromptUpdateInput): Promise<PromptWithVersion | null> {
    const existing = await this.storage.getPrompt(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const prompt = { ...existing };
    let newVersion: PromptVersion | null = null;

    if (input.content !== undefined && input.content !== existing.currentVersion.content) {
      const versionNumber = await this.storage.getNextVersionNumber(id);
      newVersion = {
        id: crypto.randomUUID(),
        promptId: id,
        version: versionNumber,
        content: input.content,
        createdAt: now,
        createdBy: input.createdBy,
        changeDescription: input.changeDescription,
        metadata: input.metadata,
      };
      await this.storage.saveVersion(newVersion);
      prompt.currentVersionId = newVersion.id;
    }

    if (input.name !== undefined) prompt.name = input.name;
    if (input.description !== undefined) prompt.description = input.description;
    if (input.tags !== undefined) prompt.tags = input.tags;
    prompt.updatedAt = now;

    await this.storage.savePrompt(prompt);

    return {
      ...prompt,
      currentVersion: newVersion || existing.currentVersion,
    };
  }

  async getPrompt(id: string, includeVersions = false): Promise<PromptWithVersion | null> {
    const prompt = await this.storage.getPrompt(id);
    if (!prompt) {
      return null;
    }

    if (includeVersions) {
      prompt.versions = await this.storage.getAllVersions(id);
    }

    return prompt;
  }

  async listPrompts(): Promise<Prompt[]> {
    return await this.storage.listPrompts();
  }

  async getPromptVersions(id: string): Promise<PromptVersion[]> {
    return await this.storage.getAllVersions(id);
  }

  private async resolveVersionReference(promptId: string, versionRef: string): Promise<string | null> {
    // Check if it's a version number reference (e.g., "v1", "v2")
    const versionMatch = versionRef.match(/^v(\d+)$/i);
    if (versionMatch) {
      const versionNumber = parseInt(versionMatch[1]);
      const versions = await this.storage.getAllVersions(promptId);
      const version = versions.find(v => v.version === versionNumber);
      return version?.id || null;
    }
    
    // Otherwise treat it as a version ID
    return versionRef;
  }

  async compareVersions(
    promptId: string,
    fromVersionRef: string,
    toVersionRef: string,
  ): Promise<VersionComparisonResult | null> {
    // Resolve version references to IDs
    const fromVersionId = await this.resolveVersionReference(promptId, fromVersionRef);
    const toVersionId = await this.resolveVersionReference(promptId, toVersionRef);
    
    if (!fromVersionId || !toVersionId) {
      return null;
    }
    
    const fromVersion = await this.storage.getVersion(promptId, fromVersionId);
    const toVersion = await this.storage.getVersion(promptId, toVersionId);

    if (!fromVersion || !toVersion) {
      return null;
    }

    const fromLines = fromVersion.content.split("\n");
    const toLines = toVersion.content.split("\n");

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const maxLength = Math.max(fromLines.length, toLines.length);
    for (let i = 0; i < maxLength; i++) {
      if (i >= fromLines.length) {
        added.push(`Line ${i + 1}: ${toLines[i]}`);
      } else if (i >= toLines.length) {
        removed.push(`Line ${i + 1}: ${fromLines[i]}`);
      } else if (fromLines[i] !== toLines[i]) {
        modified.push(`Line ${i + 1}: "${fromLines[i]}" → "${toLines[i]}"`);
      }
    }

    return {
      promptId,
      fromVersion,
      toVersion,
      changes: {
        added,
        removed,
        modified,
      },
    };
  }

  async revertToVersion(promptId: string, versionRef: string): Promise<PromptWithVersion | null> {
    // Resolve version reference to ID
    const versionId = await this.resolveVersionReference(promptId, versionRef);
    if (!versionId) {
      return null;
    }
    
    const prompt = await this.storage.getPrompt(promptId);
    const version = await this.storage.getVersion(promptId, versionId);

    if (!prompt || !version) {
      return null;
    }

    const newVersionNumber = await this.storage.getNextVersionNumber(promptId);
    const newVersion: PromptVersion = {
      id: crypto.randomUUID(),
      promptId,
      version: newVersionNumber,
      content: version.content,
      createdAt: new Date(),
      changeDescription: `Reverted to version ${version.version}`,
      metadata: version.metadata,
    };

    await this.storage.saveVersion(newVersion);

    prompt.currentVersionId = newVersion.id;
    prompt.updatedAt = new Date();
    await this.storage.savePrompt(prompt);

    return {
      ...prompt,
      currentVersion: newVersion,
    };
  }
}