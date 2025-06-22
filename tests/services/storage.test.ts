import { assertEquals, assertExists } from "@std/testing";
import { StorageService } from "../../src/services/storage.ts";
import type { Prompt, PromptVersion } from "../../src/models/prompt.ts";
import { join } from "@std/path";

Deno.test("StorageService initialization", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storage_init_test_" });

  try {
    const storage = new StorageService(testDir);
    await storage.init();

    // Check that directories were created
    const promptsDir = join(testDir, "prompts");
    const versionsDir = join(testDir, "versions");

    const promptsDirInfo = await Deno.stat(promptsDir);
    const versionsDirInfo = await Deno.stat(versionsDir);

    assertEquals(promptsDirInfo.isDirectory, true);
    assertEquals(versionsDirInfo.isDirectory, true);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Save and retrieve prompt", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storage_save_test_" });

  try {
    const storage = new StorageService(testDir);
    await storage.init();

    const prompt: Prompt = {
      id: "test-prompt-1",
      name: "Test Prompt",
      tags: ["test"],
      currentVersionId: "version-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const version: PromptVersion = {
      id: "version-1",
      promptId: "test-prompt-1",
      version: 1,
      content: "Test content",
      createdAt: new Date(),
    };

    // Save prompt and version
    await storage.savePrompt(prompt);
    await storage.saveVersion(version);

    // Retrieve prompt
    const retrieved = await storage.getPrompt("test-prompt-1");

    assertExists(retrieved);
    assertEquals(retrieved?.id, "test-prompt-1");
    assertEquals(retrieved?.name, "Test Prompt");
    assertEquals(retrieved?.currentVersion.content, "Test content");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Get next version number", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storage_version_test_" });

  try {
    const storage = new StorageService(testDir);
    await storage.init();

    const promptId = "test-prompt-2";

    // First version should be 1
    let nextVersion = await storage.getNextVersionNumber(promptId);
    assertEquals(nextVersion, 1);

    // Save some versions
    for (let i = 1; i <= 3; i++) {
      const version: PromptVersion = {
        id: `version-${i}`,
        promptId,
        version: i,
        content: `Content v${i}`,
        createdAt: new Date(),
      };
      await storage.saveVersion(version);
    }

    // Next version should be 4
    nextVersion = await storage.getNextVersionNumber(promptId);
    assertEquals(nextVersion, 4);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("List prompts", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storage_list_test_" });

  try {
    const storage = new StorageService(testDir);
    await storage.init();

    // Save multiple prompts
    const prompts: Prompt[] = [
      {
        id: "list-test-1",
        name: "Prompt 1",
        tags: [],
        currentVersionId: "v1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "list-test-2",
        name: "Prompt 2",
        tags: [],
        currentVersionId: "v2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const prompt of prompts) {
      await storage.savePrompt(prompt);
    }

    const list = await storage.listPrompts();
    const testPrompts = list.filter((p) => p.id.startsWith("list-test-"));
    assertEquals(testPrompts.length, 2);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
