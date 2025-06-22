# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Commands
```bash
# Development mode with file watching
deno task dev <command> [options]

# Run from source without building
deno task start <command> [options]

# Build executable
deno task build

# Type checking
deno task check
```

### Testing Commands
```bash
# Run all tests
deno task test

# Run tests with coverage
deno task test:coverage

# Run tests in watch mode
deno task test:watch

# Run specific test file
deno test --allow-read --allow-write --allow-env tests/services/storage.test.ts
```

### Code Quality Commands
```bash
# Lint code
deno task lint

# Format code
deno task fmt
```

## Architecture Overview

This is a CLI tool for managing versioned AI prompts with a layered architecture:

### Core Components

**Entry Point (`src/main.ts`)**
- Parses command-line arguments using `@std/cli`
- Instantiates the service layer: StorageService → PromptManager → CLIService
- Handles top-level error catching

**Data Models (`src/models/prompt.ts`)**
- `Prompt`: Core prompt metadata (name, tags, current version reference)
- `PromptVersion`: Individual version content with sequential numbering
- `PromptWithVersion`: Combined view for API responses
- Separation allows for efficient storage and version history

**Storage Layer (`src/services/storage.ts`)**
- File-based JSON storage in `~/.prompt-manager/`
- Prompts stored as `prompts/{id}.json`
- Versions stored as `versions/{promptId}/v{version}.json` for human readability
- Version files named by sequential numbers (v1.json, v2.json) rather than UUIDs

**Business Logic (`src/services/prompt-manager.ts`)**
- Core prompt operations: create, update, compare, revert
- Version resolution: supports both version numbers ("v1", "v2") and UUIDs
- Content diffing for version comparison
- Automatic version increment on content changes

**CLI Interface (`src/services/cli.ts`)**
- Command routing and argument validation
- Colored output using `@std/fmt/colors`
- User-friendly error messages with usage examples

### Key Design Decisions

**Version Reference Ergonomics**
- Users can reference versions as "v1", "v2" instead of long UUIDs
- `resolveVersionReference()` method supports both formats for flexibility
- Case-insensitive version matching

**Storage Strategy**
- Human-readable file structure prioritized over query performance
- Each version stored independently for simple access patterns
- Sequential version numbering for user comprehension

**Testing Strategy**
- Each test creates isolated temporary directories to prevent interference
- Tests use `try/finally` blocks for cleanup
- Comprehensive coverage of version reference functionality

### Permission Requirements

All commands require: `--allow-read --allow-write --allow-env`
- File I/O for prompt storage
- Environment access for HOME directory detection

### File Storage Structure
```
~/.prompt-manager/
├── prompts/
│   └── {uuid}.json          # Prompt metadata
└── versions/
    └── {promptId}/
        ├── v1.json          # Version content
        ├── v2.json
        └── v3.json
```