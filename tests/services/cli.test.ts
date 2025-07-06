import { assertEquals } from "@std/testing";
import { CLIService } from "../../src/services/cli.ts";
import { PromptManager } from "../../src/services/prompt-manager.ts";
import { StorageService } from "../../src/services/storage.ts";
import type { ParsedArgs } from "../../src/types/cli.ts";

// Capture console output for testing
async function captureConsoleOutput(
  fn: () => void | Promise<void>,
): Promise<string[]> {
  const outputs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    outputs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    outputs.push(args.map(String).join(" "));
  };

  await Promise.resolve(fn());
  console.log = originalLog;
  console.error = originalError;
  return outputs;
}

Deno.test("CLI shows help", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "cli_help_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    const args: ParsedArgs = {
      _: [],
      help: true,
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(args);
    });

    const helpText = output.join("\n");
    assertEquals(helpText.includes("Prompt Manager"), true);
    assertEquals(helpText.includes("Usage:"), true);
    assertEquals(helpText.includes("Commands:"), true);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI lists prompts when empty", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "cli_list_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    const args: ParsedArgs = {
      _: ["list"],
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(args);
    });

    assertEquals(output[0], "No prompts found");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI handles unknown command", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "cli_unknown_test_" });

  try {
    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    const args: ParsedArgs = {
      _: ["unknown-command"],
    };

    // We need to prevent the process from exiting
    const originalExit = Deno.exit;
    let exitCode: number | undefined;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("Exit called");
    };

    try {
      const _output = await captureConsoleOutput(async () => {
        await cli.run(args);
      });
    } catch (e) {
      if (e instanceof Error && e.message !== "Exit called") throw e;
    }

    Deno.exit = originalExit;
    assertEquals(exitCode, 1);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI create command with message flag", async () => {
  const testDir = await Deno.makeTempDir({
    prefix: "cli_create_message_test_",
  });
  const testFile = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });

  try {
    await Deno.writeTextFile(testFile, "Test prompt content");

    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    const args: ParsedArgs = {
      _: ["create"],
      name: "Test Prompt",
      file: testFile,
      message: "Custom initial version",
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(args);
    });

    assertEquals(output[0].includes("✓ Prompt created successfully"), true);

    // Verify the prompt was created with the custom message
    const prompts = await manager.listPrompts();
    assertEquals(prompts.length, 1);

    const versions = await manager.getPromptVersions(prompts[0].id);
    assertEquals(versions.length, 1);
    assertEquals(versions[0].changeDescription, "Custom initial version");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI create command without message flag uses default", async () => {
  const testDir = await Deno.makeTempDir({
    prefix: "cli_create_default_test_",
  });
  const testFile = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });

  try {
    await Deno.writeTextFile(testFile, "Test prompt content");

    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    const args: ParsedArgs = {
      _: ["create"],
      name: "Test Prompt",
      file: testFile,
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(args);
    });

    assertEquals(output[0].includes("✓ Prompt created successfully"), true);

    // Verify the prompt was created with the default message
    const prompts = await manager.listPrompts();
    assertEquals(prompts.length, 1);

    const versions = await manager.getPromptVersions(prompts[0].id);
    assertEquals(versions.length, 1);
    assertEquals(versions[0].changeDescription, "Initial version");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI update command with message flag", async () => {
  const testDir = await Deno.makeTempDir({
    prefix: "cli_update_message_test_",
  });
  const testFile1 = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });
  const testFile2 = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });

  try {
    await Deno.writeTextFile(testFile1, "Initial content");
    await Deno.writeTextFile(testFile2, "Updated content");

    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    // Create initial prompt
    const createArgs: ParsedArgs = {
      _: ["create"],
      name: "Test Prompt",
      file: testFile1,
    };

    await captureConsoleOutput(async () => {
      await cli.run(createArgs);
    });

    const prompts = await manager.listPrompts();
    const promptId = prompts[0].id;

    // Update with message
    const updateArgs: ParsedArgs = {
      _: ["update", promptId],
      file: testFile2,
      message: "Fixed critical bug",
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(updateArgs);
    });

    assertEquals(output[0].includes("✓ Prompt updated successfully"), true);

    // Verify the version was created with the custom message
    const versions = await manager.getPromptVersions(promptId);
    assertEquals(versions.length, 2);
    assertEquals(versions[1].changeDescription, "Fixed critical bug");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("CLI displays change descriptions in version list", async () => {
  const testDir = await Deno.makeTempDir({
    prefix: "cli_versions_display_test_",
  });
  const testFile1 = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });
  const testFile2 = await Deno.makeTempFile({ dir: testDir, suffix: ".txt" });

  try {
    await Deno.writeTextFile(testFile1, "Initial content");
    await Deno.writeTextFile(testFile2, "Updated content");

    const storage = new StorageService(testDir);
    const manager = new PromptManager(storage);
    const cli = new CLIService(manager);

    // Create initial prompt with message
    const createArgs: ParsedArgs = {
      _: ["create"],
      name: "Test Prompt",
      file: testFile1,
      message: "Initial implementation",
    };

    await captureConsoleOutput(async () => {
      await cli.run(createArgs);
    });

    const prompts = await manager.listPrompts();
    const promptId = prompts[0].id;

    // Update with another message
    const updateArgs: ParsedArgs = {
      _: ["update", promptId],
      file: testFile2,
      message: "Added error handling",
    };

    await captureConsoleOutput(async () => {
      await cli.run(updateArgs);
    });

    // List versions
    const versionsArgs: ParsedArgs = {
      _: ["versions", promptId],
    };

    const output = await captureConsoleOutput(async () => {
      await cli.run(versionsArgs);
    });

    // Check that change descriptions are displayed
    const outputText = output.join("\n");
    assertEquals(outputText.includes("(Initial implementation)"), true);
    assertEquals(outputText.includes("(Added error handling)"), true);
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
