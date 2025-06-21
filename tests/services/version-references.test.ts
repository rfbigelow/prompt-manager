import { assertEquals, assertExists } from "@std/testing";
import { PromptManager } from "../../src/services/prompt-manager.ts";
import { StorageService } from "../../src/services/storage.ts";

Deno.test("Compare versions using version numbers", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "version_ref_test_" });
  
  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create prompt with multiple versions
    const created = await manager.createPrompt({
      name: "Version Reference Test",
      content: "Original content",
    });

    const v2 = await manager.updatePrompt(created.id, {
      content: "Modified content",
    });

    const v3 = await manager.updatePrompt(created.id, {
      content: "Further modified content",
    });

    // Test comparison using version numbers
    const comparison = await manager.compareVersions(created.id, "v1", "v2");
    assertExists(comparison);
    assertEquals(comparison?.fromVersion.version, 1);
    assertEquals(comparison?.toVersion.version, 2);

    // Test comparison mixing version number and ID
    const mixedComparison = await manager.compareVersions(
      created.id, 
      "v1", 
      v3!.currentVersion.id
    );
    assertExists(mixedComparison);
    assertEquals(mixedComparison?.fromVersion.version, 1);
    assertEquals(mixedComparison?.toVersion.version, 3);

    // Test case insensitive version references
    const caseInsensitive = await manager.compareVersions(created.id, "V1", "V2");
    assertExists(caseInsensitive);
    assertEquals(caseInsensitive?.fromVersion.version, 1);
    assertEquals(caseInsensitive?.toVersion.version, 2);

  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Revert using version numbers", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "revert_ref_test_" });
  
  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    // Create prompt with multiple versions
    const v1 = await manager.createPrompt({
      name: "Revert Test",
      content: "Version 1 content",
    });

    await manager.updatePrompt(v1.id, {
      content: "Version 2 content",
    });

    await manager.updatePrompt(v1.id, {
      content: "Version 3 content",
    });

    // Revert to v1 using version number
    const reverted = await manager.revertToVersion(v1.id, "v1");
    assertExists(reverted);
    assertEquals(reverted?.currentVersion.content, "Version 1 content");
    assertEquals(reverted?.currentVersion.version, 4); // New version created

    // Revert using version ID (should also work)
    const revertedById = await manager.revertToVersion(v1.id, v1.currentVersion.id);
    assertExists(revertedById);
    assertEquals(revertedById?.currentVersion.content, "Version 1 content");
    assertEquals(revertedById?.currentVersion.version, 5);

  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("Invalid version references return null", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "invalid_ref_test_" });
  
  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);

    const created = await manager.createPrompt({
      name: "Invalid Reference Test",
      content: "Original content",
    });

    // Test invalid version number
    const invalidVersion = await manager.compareVersions(created.id, "v99", "v1");
    assertEquals(invalidVersion, null);

    // Test invalid version ID
    const invalidId = await manager.compareVersions(created.id, "invalid-id", "v1");
    assertEquals(invalidId, null);

    // Test revert with invalid version
    const invalidRevert = await manager.revertToVersion(created.id, "v99");
    assertEquals(invalidRevert, null);

  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});