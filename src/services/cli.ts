import { PromptManager } from "./prompt-manager.ts";
import * as colors from "@std/fmt/colors";
import { ParsedArgs } from "../types/cli.ts";

export class CLIService {
  constructor(private promptManager: PromptManager) {}

  async run(args: ParsedArgs): Promise<void> {
    if (args.help) {
      this.showHelp();
      return;
    }

    const command = args._[0] as string;

    switch (command) {
      case "create":
        await this.createPrompt(args);
        break;
      case "update":
        await this.updatePrompt(args);
        break;
      case "get":
        await this.getPrompt(args);
        break;
      case "list":
        await this.listPrompts();
        break;
      case "versions":
        await this.listVersions(args);
        break;
      case "compare":
        await this.compareVersions(args);
        break;
      case "revert":
        await this.revertToVersion(args);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        this.showHelp();
        Deno.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
Prompt Manager - A tool for managing versioned prompts

Usage:
  prompt-manager <command> [options]

Commands:
  create    Create a new prompt
  update    Update an existing prompt (creates new version)
  get       Get a prompt by ID
  list      List all prompts
  versions  List all versions of a prompt
  compare   Compare two versions of a prompt
  revert    Revert to a specific version

Options:
  -h, --help      Show help
  -n, --name      Prompt name
  -f, --file      File containing prompt content
  -v, --verbose   Show detailed output

Examples:
  prompt-manager create -n "My Prompt" -f prompt.txt
  prompt-manager update <id> -f updated-prompt.txt
  prompt-manager get <id>
  prompt-manager list
  prompt-manager versions <id>
  prompt-manager compare <id> v1 v3
  prompt-manager compare <id> <version-id> v2
  prompt-manager revert <id> v1
  prompt-manager revert <id> <version-id>
    `);
  }

  private async createPrompt(args: ParsedArgs): Promise<void> {
    const name = args.name;
    if (!name) {
      console.error("Error: Prompt name is required");
      Deno.exit(1);
    }

    let content = "";
    if (args.file) {
      content = await Deno.readTextFile(args.file);
    } else {
      console.error("Error: Content file is required");
      Deno.exit(1);
    }

    const prompt = await this.promptManager.createPrompt({
      name,
      content,
    });

    console.log(colors.green("✓ Prompt created successfully"));
    console.log(`ID: ${prompt.id}`);
    console.log(`Name: ${prompt.name}`);
    console.log(`Version: ${prompt.currentVersion.version}`);
  }

  private async updatePrompt(args: ParsedArgs): Promise<void> {
    const id = args._[1] as string;
    if (!id) {
      console.error("Error: Prompt ID is required");
      Deno.exit(1);
    }

    const input: { name?: string; content?: string } = {};
    if (args.name) input.name = args.name;
    if (args.file) {
      input.content = await Deno.readTextFile(args.file);
    }

    const prompt = await this.promptManager.updatePrompt(id, input);
    if (!prompt) {
      console.error("Error: Prompt not found");
      Deno.exit(1);
    }

    console.log(colors.green("✓ Prompt updated successfully"));
    console.log(`Version: ${prompt.currentVersion.version}`);
  }

  private async getPrompt(args: ParsedArgs): Promise<void> {
    const id = args._[1] as string;
    if (!id) {
      console.error("Error: Prompt ID is required");
      Deno.exit(1);
    }

    const prompt = await this.promptManager.getPrompt(id, args.verbose);
    if (!prompt) {
      console.error("Error: Prompt not found");
      Deno.exit(1);
    }

    console.log(`Name: ${prompt.name}`);
    console.log(`ID: ${prompt.id}`);
    console.log(`Current Version: ${prompt.currentVersion.version}`);
    console.log(`Created: ${prompt.createdAt}`);
    console.log(`Updated: ${prompt.updatedAt}`);
    console.log("\nContent:");
    console.log(prompt.currentVersion.content);

    if (args.verbose && prompt.versions) {
      console.log("\nVersion History:");
      for (const v of prompt.versions) {
        console.log(`  v${v.version} - ${v.createdAt} ${v.changeDescription ? `(${v.changeDescription})` : ""}`);
      }
    }
  }

  private async listPrompts(): Promise<void> {
    const prompts = await this.promptManager.listPrompts();
    if (prompts.length === 0) {
      console.log("No prompts found");
      return;
    }

    console.log("Prompts:");
    for (const prompt of prompts) {
      console.log(`  ${prompt.id} - ${prompt.name} (updated: ${prompt.updatedAt})`);
    }
  }

  private async listVersions(args: ParsedArgs): Promise<void> {
    const id = args._[1] as string;
    if (!id) {
      console.error("Error: Prompt ID is required");
      Deno.exit(1);
    }

    const versions = await this.promptManager.getPromptVersions(id);
    if (versions.length === 0) {
      console.log("No versions found");
      return;
    }

    console.log("Versions:");
    for (const v of versions) {
      console.log(`  v${v.version} - ${v.createdAt} ${v.changeDescription ? `(${v.changeDescription})` : ""}`);
      console.log(`    ID: ${v.id}`);
    }
  }

  private async compareVersions(args: ParsedArgs): Promise<void> {
    const promptId = args._[1] as string;
    const fromVersionRef = args._[2] as string;
    const toVersionRef = args._[3] as string;

    if (!promptId || !fromVersionRef || !toVersionRef) {
      console.error("Error: prompt ID and two version references are required");
      console.error("Usage: prompt-manager compare <prompt-id> <from-version> <to-version>");
      console.error("Version can be: v1, v2, v3... or version ID");
      Deno.exit(1);
    }

    const result = await this.promptManager.compareVersions(promptId, fromVersionRef, toVersionRef);
    if (!result) {
      console.error("Error: Could not compare versions. Check that prompt and versions exist.");
      Deno.exit(1);
    }

    console.log(`Comparing v${result.fromVersion.version} → v${result.toVersion.version}`);
    
    if (result.changes.added.length > 0) {
      console.log(colors.green("\nAdded:"));
      result.changes.added.forEach(line => console.log(colors.green(`+ ${line}`)));
    }

    if (result.changes.removed.length > 0) {
      console.log(colors.red("\nRemoved:"));
      result.changes.removed.forEach(line => console.log(colors.red(`- ${line}`)));
    }

    if (result.changes.modified.length > 0) {
      console.log(colors.yellow("\nModified:"));
      result.changes.modified.forEach(line => console.log(colors.yellow(`~ ${line}`)));
    }
  }

  private async revertToVersion(args: ParsedArgs): Promise<void> {
    const promptId = args._[1] as string;
    const versionRef = args._[2] as string;

    if (!promptId || !versionRef) {
      console.error("Error: Prompt ID and version reference are required");
      console.error("Usage: prompt-manager revert <prompt-id> <version>");
      console.error("Version can be: v1, v2, v3... or version ID");
      Deno.exit(1);
    }

    const prompt = await this.promptManager.revertToVersion(promptId, versionRef);
    if (!prompt) {
      console.error("Error: Could not revert to version. Check that prompt and version exist.");
      Deno.exit(1);
    }

    console.log(colors.green("✓ Reverted successfully"));
    console.log(`New version: ${prompt.currentVersion.version}`);
  }
}