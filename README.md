# Prompt Manager

A command-line tool for managing and versioning AI prompts with full version history, comparison, and reversion capabilities.

## Features

- 📝 **Version Control** - Every prompt edit creates a new version
- 🔄 **Comparison** - Compare different versions to see what changed
- ⏪ **Reversion** - Revert to any previous version
- 🏷️ **Tagging** - Organize prompts with tags
- 📁 **File-based Storage** - Simple, portable JSON storage
- 🎨 **Clean CLI** - Intuitive command-line interface with colored output

## Requirements

- [Deno](https://deno.land/) 2.3.0 or higher

## Installation

### Clone and Build

```bash
git clone https://github.com/rfbigelow/prompt-manager.git
cd prompt-manager

# Build executable
deno task build

# The executable will be in dist/prompt-manager
```

### Run from Source

```bash
# Run directly without building
deno task start <command> [options]

# Or use the dev mode with file watching
deno task dev <command> [options]
```

## Usage

### Create a New Prompt

```bash
# Create from file
prompt-manager create -n "API Request Template" -f templates/api-request.txt

# Example output:
# ✓ Prompt created successfully
# ID: 550e8400-e29b-41d4-a716-446655440000
# Name: API Request Template
# Version: 1
```

### Update an Existing Prompt

```bash
# Update creates a new version
prompt-manager update 550e8400-e29b-41d4-a716-446655440000 -f templates/api-request-v2.txt

# Example output:
# ✓ Prompt updated successfully
# Version: 2
```

### View a Prompt

```bash
# Basic view
prompt-manager get 550e8400-e29b-41d4-a716-446655440000

# View with version history
prompt-manager get 550e8400-e29b-41d4-a716-446655440000 --verbose
```

### List All Prompts

```bash
prompt-manager list

# Example output:
# Prompts:
#   550e8400-e29b-41d4-a716-446655440000 - API Request Template (updated: 2024-01-20T10:30:00)
#   660f9500-f39c-52e5-b827-557766550111 - Code Review Guidelines (updated: 2024-01-19T15:45:00)
```

### View Version History

```bash
prompt-manager versions 550e8400-e29b-41d4-a716-446655440000

# Example output:
# Versions:
#   v1 - 2024-01-20T10:00:00 (Initial version)
#     ID: 770g0611-g40d-63f6-c938-668877661222
#   v2 - 2024-01-20T10:30:00 (Added error handling section)
#     ID: 880h1722-h51e-74g7-d049-779988772333
```

### Compare Versions

```bash
prompt-manager compare 550e8400-e29b-41d4-a716-446655440000 770g0611-g40d-63f6-c938-668877661222 880h1722-h51e-74g7-d049-779988772333

# Example output:
# Comparing v1 → v2
#
# Modified:
# ~ Line 5: "Make a GET request" → "Make a GET request with error handling"
#
# Added:
# + Line 10: Handle network errors gracefully
# + Line 11: Retry failed requests up to 3 times
```

### Revert to Previous Version

```bash
prompt-manager revert 550e8400-e29b-41d4-a716-446655440000 770g0611-g40d-63f6-c938-668877661222

# Example output:
# ✓ Reverted successfully
# New version: 3
```

## Data Storage

Prompts are stored in your home directory under `~/.prompt-manager/`:

```
~/.prompt-manager/
├── prompts/
│   ├── 550e8400-e29b-41d4-a716-446655440000.json
│   └── 660f9500-f39c-52e5-b827-557766550111.json
└── versions/
    ├── 550e8400-e29b-41d4-a716-446655440000/
    │   ├── v1.json
    │   ├── v2.json
    │   └── v3.json
    └── 660f9500-f39c-52e5-b827-557766550111/
        └── v1.json
```

## Development

### Setup

```bash
git clone https://github.com/rfbigelow/prompt-manager.git
cd prompt-manager
```

### Available Tasks

```bash
# Development mode with file watching
deno task dev

# Run tests
deno task test

# Run tests with coverage
deno task test:coverage

# Run tests in watch mode
deno task test:watch

# Lint code
deno task lint

# Format code
deno task fmt

# Type check
deno task check

# Build executable
deno task build
```

### Project Structure

```
prompt-manager/
├── src/
│   ├── main.ts           # Entry point
│   ├── models/
│   │   └── prompt.ts     # Data models
│   ├── services/
│   │   ├── cli.ts        # CLI interface
│   │   ├── prompt-manager.ts  # Business logic
│   │   └── storage.ts    # File storage
│   └── types/
│       └── cli.ts        # TypeScript types
├── tests/                # Test files
├── deno.json            # Deno configuration
└── README.md
```

### Running Tests

```bash
# Run all tests
deno task test

# Run with coverage report
deno task test:coverage

# Coverage report will be in coverage/html/index.html
```

## Architecture Decisions

- **File-based Storage**: Uses JSON files for simplicity and portability
- **Version Numbering**: Sequential integers for human readability
- **UUID Identifiers**: Ensures unique IDs across systems
- **Separate Version Files**: Each version stored independently for easy access

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`deno task test`)
5. Ensure code is formatted (`deno task fmt`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Robert F. Bigelow Jr.

## Acknowledgments

- Built with [Deno](https://deno.land/)
- Uses Deno's standard library for core functionality
