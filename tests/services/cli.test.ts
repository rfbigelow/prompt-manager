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
