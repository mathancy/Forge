# Forge Browser

A lightweight custom browser built with Electron by **Forgeworks Interactive Limited**.

## Features

- 🚀 **Lightweight** - Minimal footprint, maximum performance
- 🎨 **Modern UI** - Clean, dark theme with custom titlebar
- 📑 **Tabbed Browsing** - Full tab management support
- ⌨️ **Keyboard Shortcuts** - Familiar browser shortcuts
- 🔒 **Security Indicators** - Visual HTTPS/HTTP indicators
- 🔮 **Future: Ad-blocking** - Native ad-blocker coming soon

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run in development mode (with DevTools)
npm run dev

# Run in production mode
npm start
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New Tab |
| `Ctrl+W` | Close Tab |
| `Ctrl+L` | Focus URL Bar |
| `Ctrl+R` / `F5` | Reload |
| `Alt+Left` | Back |
| `Alt+Right` | Forward |

## Project Structure

```
ForgeBrowser/
├── src/
│   ├── main/
│   │   └── main.js          # Main process
│   ├── preload/
│   │   └── preload.js       # Preload script (IPC bridge)
│   └── renderer/
│       ├── index.html       # Browser UI
│       ├── styles.css       # Styling
│       └── renderer.js      # Renderer process logic
├── assets/
│   └── icon.png             # App icon
└── package.json
```

## Tech Stack

- **Electron 40** - Cross-platform desktop framework
- **Chromium** - Web rendering engine
- **Node.js** - Backend runtime

## Roadmap

- [ ] Native ad-blocker
- [ ] Bookmarks management
- [ ] History panel
- [ ] Downloads manager
- [ ] Settings page
- [ ] Extensions support

## License

MIT © 2026 Forgeworks Interactive Limited
