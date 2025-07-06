import { parseArgs } from "@std/cli";
import { PromptManager } from "./services/prompt-manager.ts";
import { StorageService } from "./services/storage.ts";
import { CLIService } from "./services/cli.ts";

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["command", "name", "file", "message"],
    boolean: ["help", "list", "verbose"],
    alias: {
      h: "help",
      l: "list",
      v: "verbose",
      n: "name",
      f: "file",
      m: "message",
    },
  });

  const storageService = new StorageService();
  const promptManager = new PromptManager(storageService);
  const cliService = new CLIService(promptManager);

  try {
    await cliService.run(args);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
