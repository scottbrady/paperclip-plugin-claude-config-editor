# paperclip-plugin-claude-config-editor

A [Paperclip](https://github.com/paperclipai/paperclip) plugin that lets instance administrators edit Claude Code configuration files (`.claude.json` and `.credentials.json`) through the Paperclip settings UI.

## Features

- Edit `~/.claude.json` (Claude Code settings) and `~/.claude/.credentials.json` (API credentials) from the admin settings page
- JSON validation before saving
- Atomic file writes to prevent partial updates
- Confirmation prompt before overwriting credentials

## Installation

```bash
npm install paperclip-plugin-claude-config-editor
```

Then register the plugin in your Paperclip instance configuration.

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch mode (rebuilds on changes)
npm run dev

# Start the plugin dev server for UI development
npm run dev:ui

# Type-check without emitting
npm run typecheck
```

## How it works

The plugin registers a **settings page** slot in Paperclip's admin UI. It exposes:

- **Data source** (`claude-config`) — reads the current contents of both config files
- **Action** (`save-claude-config`) — validates and writes updated JSON back to disk

Access is gated by the `instance.settings.register` capability, so only instance admins can view or modify the configuration.

## License

MIT
