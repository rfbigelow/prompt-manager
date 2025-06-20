import { assertEquals, assertExists } from "@std/testing";
import type { Prompt, PromptVersion, PromptWithVersion } from "../../src/models/prompt.ts";

Deno.test("Prompt model structure", () => {
  const prompt: Prompt = {
    id: "test-id",
    name: "Test Prompt",
    description: "A test prompt",
    tags: ["test", "example"],
    currentVersionId: "version-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: { category: "testing" },
  };

  assertEquals(prompt.id, "test-id");
  assertEquals(prompt.name, "Test Prompt");
  assertEquals(prompt.tags.length, 2);
  assertExists(prompt.createdAt);
});

Deno.test("PromptVersion model structure", () => {
  const version: PromptVersion = {
    id: "version-1",
    promptId: "test-id",
    version: 1,
    content: "This is the prompt content",
    createdAt: new Date(),
    createdBy: "test-user",
    changeDescription: "Initial version",
    metadata: {},
  };

  assertEquals(version.version, 1);
  assertEquals(version.content, "This is the prompt content");
  assertEquals(version.createdBy, "test-user");
});

Deno.test("PromptWithVersion combines prompt and version", () => {
  const promptWithVersion: PromptWithVersion = {
    id: "test-id",
    name: "Test Prompt",
    tags: [],
    currentVersionId: "version-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    currentVersion: {
      id: "version-1",
      promptId: "test-id",
      version: 1,
      content: "Content",
      createdAt: new Date(),
    },
  };

  assertExists(promptWithVersion.currentVersion);
  assertEquals(promptWithVersion.currentVersion.promptId, promptWithVersion.id);
});