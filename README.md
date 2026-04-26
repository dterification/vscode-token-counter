# Token Counter

VS Code extension that counts LLM tokens for the active file or a selected directory. The count updates automatically when you focus a new file and displays in the status bar.

## Features

- **Auto-count on focus** — token count updates as you switch files
- **Directory count** — right-click any folder in the explorer to count all files
- **Status bar display** — shows total tokens; click to recount
- **Configurable** — control which files are included, model label, and performance limits

## Settings

| Setting | Default | Description |
|---|---|---|
| `tokenCounter.countOnFocus` | `true` | Auto-count when active editor changes |
| `tokenCounter.model` | `"gpt-4o"` | Model label shown in tooltip |
| `tokenCounter.maxFileSizeKB` | `512` | Skip files larger than this (KB) |
| `tokenCounter.includeExtensions` | `[]` | If set, count only these extensions |
| `tokenCounter.excludeExtensions` | *(binary/media)* | Extensions to always skip |
| `tokenCounter.excludeGlobs` | *(node_modules, .git, …)* | Glob patterns to skip in directory counts |

## Commands

- `Token Counter: Count Active File` — explicit count for the open file
- `Token Counter: Count File or Folder` — available in explorer right-click menu
- `Token Counter: Recount Last Target` — rerun the last count (also bound to status bar click)

## Notes

The tokenizer uses `cl100k_base` encoding (tiktoken), which is accurate for GPT-4 and GPT-3.5-turbo and a close approximation for GPT-4o.
