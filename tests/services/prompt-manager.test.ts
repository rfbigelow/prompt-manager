import { assertEquals, assertExists, assertNotEquals } from "@std/testing";
import { PromptManager } from "../../src/services/prompt-manager.ts";
import { StorageService } from "../../src/services/storage.ts";

Deno.test("Create prompt with initial version", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_create_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    const result = await manager.createPrompt({
      name: "Test Prompt",
      content: "Initial content",
      tags: ["test", "demo"],
      description: "A test prompt",
    });

    assertExists(result.id);
    assertEquals(result.name, "Test Prompt");
    assertEquals(result.currentVersion.version, 1);
    assertEquals(result.currentVersion.content, "Initial content");
    assertEquals(result.currentVersion.changeDescription, "Initial version");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Update prompt creates new version", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_update_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create initial prompt
    const created = await manager.createPrompt({
      name: "Update Test",
      content: "Version 1 content",
    });

    // Update with new content
    const updated = await manager.updatePrompt(created.id, {
      content: "Version 2 content",
      changeDescription: "Updated content",
    });

    assertExists(updated);
    assertEquals(updated?.currentVersion.version, 2);
    assertEquals(updated?.currentVersion.content, "Version 2 content");
    assertEquals(updated?.currentVersion.changeDescription, "Updated content");
    assertNotEquals(updated?.currentVersion.id, created.currentVersion.id);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Update prompt metadata without new version", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_metadata_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create initial prompt
    const created = await manager.createPrompt({
      name: "Metadata Test",
      content: "Same content",
    });

    const originalVersionId = created.currentVersion.id;

    // Update only metadata (no content change)
    const updated = await manager.updatePrompt(created.id, {
      name: "Updated Name",
      description: "New description",
      tags: ["updated"],
    });

    assertExists(updated);
    assertEquals(updated?.name, "Updated Name");
    assertEquals(updated?.description, "New description");
    assertEquals(updated?.tags, ["updated"]);
    // Version should not change
    assertEquals(updated?.currentVersion.id, originalVersionId);
    assertEquals(updated?.currentVersion.version, 1);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Compare versions", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_compare_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create prompt with initial version
    const created = await manager.createPrompt({
      name: "Compare Test",
      content: "Line 1\nLine 2\nLine 3",
    });

    // Update to create version 2
    const updated = await manager.updatePrompt(created.id, {
      content: "Line 1 modified\nLine 2\nLine 3\nLine 4",
    });

    const comparison = await manager.compareVersions(
      created.id,
      created.currentVersion.id,
      updated!.currentVersion.id,
    );

    assertExists(comparison);
    assertEquals(comparison?.changes.modified.length, 1);
    assertEquals(comparison?.changes.added.length, 1);
    assertEquals(comparison?.changes.removed.length, 0);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Revert to previous version", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_revert_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create prompt
    const v1 = await manager.createPrompt({
      name: "Revert Test",
      content: "Original content",
    });

    // Update to v2
    await manager.updatePrompt(v1.id, {
      content: "Modified content",
    });

    // Update to v3
    await manager.updatePrompt(v1.id, {
      content: "Further modified",
    });

    // Revert to v1
    const reverted = await manager.revertToVersion(v1.id, v1.currentVersion.id);

    assertExists(reverted);
    assertEquals(reverted?.currentVersion.content, "Original content");
    assertEquals(reverted?.currentVersion.version, 4); // New version number
    assertEquals(
      reverted?.currentVersion.changeDescription,
      "Reverted to version 1",
    );
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Get prompt with all versions", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "pm_versions_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create and update prompt multiple times
    const created = await manager.createPrompt({
      name: "Version History Test",
      content: "v1",
    });

    await manager.updatePrompt(created.id, { content: "v2" });
    await manager.updatePrompt(created.id, { content: "v3" });

    const promptWithVersions = await manager.getPrompt(created.id, true);

    assertExists(promptWithVersions);
    assertExists(promptWithVersions?.versions);
    assertEquals(promptWithVersions?.versions?.length, 3);
    assertEquals(promptWithVersions?.versions?.[0].version, 1);
    assertEquals(promptWithVersions?.versions?.[2].version, 3);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
