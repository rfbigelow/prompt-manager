import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { Prompt, PromptVersion, PromptWithVersion } from "../models/prompt.ts";

export class StorageService {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ||
      join(Deno.env.get("HOME") || ".", ".prompt-manager");
  }

  async init(): Promise<void> {
    await ensureDir(join(this.dataDir, "prompts"));
    await ensureDir(join(this.dataDir, "versions"));
  }

  async savePrompt(prompt: Prompt): Promise<void> {
    const filePath = join(this.dataDir, "prompts", `${prompt.id}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(prompt, null, 2));
  }

  async saveVersion(version: PromptVersion): Promise<void> {
    const versionDir = join(this.dataDir, "versions", version.promptId);
    await ensureDir(versionDir);
    const filePath = join(versionDir, `v${version.version}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(version, null, 2));
  }

  async getPrompt(id: string): Promise<PromptWithVersion | null> {
    try {
      const promptPath = join(this.dataDir, "prompts", `${id}.json`);
      const promptData = await Deno.readTextFile(promptPath);
      const prompt = JSON.parse(promptData) as Prompt;

      const currentVersion = await this.getVersion(
        prompt.id,
        prompt.currentVersionId,
      );
      if (!currentVersion) {
        return null;
      }

      return {
        ...prompt,
        currentVersion,
      };
    } catch {
      return null;
    }
  }

  async getVersion(
    promptId: string,
    versionId: string,
  ): Promise<PromptVersion | null> {
    try {
      const versionFiles = [];
      for await (
        const entry of Deno.readDir(join(this.dataDir, "versions", promptId))
      ) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          versionFiles.push(entry.name);
        }
      }

      for (const file of versionFiles) {
        const versionPath = join(this.dataDir, "versions", promptId, file);
        const versionData = await Deno.readTextFile(versionPath);
        const version = JSON.parse(versionData) as PromptVersion;
        if (version.id === versionId) {
          return version;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAllVersions(promptId: string): Promise<PromptVersion[]> {
    const versions: PromptVersion[] = [];
    try {
      const versionDir = join(this.dataDir, "versions", promptId);
      for await (const entry of Deno.readDir(versionDir)) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          const versionPath = join(versionDir, entry.name);
          const versionData = await Deno.readTextFile(versionPath);
          versions.push(JSON.parse(versionData) as PromptVersion);
        }
      }
      versions.sort((a, b) => a.version - b.version);
    } catch {
      // Directory doesn't exist yet
    }
    return versions;
  }

  async listPrompts(): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    try {
      for await (const entry of Deno.readDir(join(this.dataDir, "prompts"))) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          const promptPath = join(this.dataDir, "prompts", entry.name);
          const promptData = await Deno.readTextFile(promptPath);
          prompts.push(JSON.parse(promptData) as Prompt);
        }
      }
    } catch {
      // Directory doesn't exist yet
    }
    return prompts;
  }

  async getNextVersionNumber(promptId: string): Promise<number> {
    const versions = await this.getAllVersions(promptId);
    return versions.length > 0
      ? Math.max(...versions.map((v) => v.version)) + 1
      : 1;
  }
}
