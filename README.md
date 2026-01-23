# Forge Browser

A lightweight, privacy-focused browser built with Electron by **Forgeworks Interactive Limited**.

<img width="1652" height="1080" alt="forgebrowserrender" src="https://github.com/user-attachments/assets/c246fa0c-5797-40d8-8120-5512592162bc" />

## Features

### 🛡️ Privacy & Security
- **Native Ad Blocker** - Built-in ad blocking with multiple filter lists (EasyList, EasyPrivacy, YouTube-specific rules)
- **Cosmetic Filtering** - Hides ad placeholders and banners for cleaner pages
- **Script Injection Protection** - Blocks malicious scripts and trackers
- **Security Indicators** - Visual HTTPS/HTTP indicators in the URL bar
- **Password Manager** - Securely store and auto-fill credentials with CSV import support

### 🤖 AI Assistant
- **Built-in AI Chat** - Integrated AI assistant sidebar
- **Multi-Agent Support** - ChatGPT, Claude, Grok and Gemini are available to use after sign in
- **Toggleable Visibility** - You can choose which agents are available in the 'AI Assistants' panel

### 🎨 Modern Interface
- **Customizable Theme** - Clean, modern UI with smooth animations and interchangeable themes
- **Tabbed Browsing** - Full tab management with drag-and-drop reordering
- **Sidebar Panels** - Quick access to History, Downloads (soon), Bookmarks (soon), Favorites and Settings (soon)
- **Responsive Design** - Adapts to different window sizes

### 📚 Organization
- **History Panel** - Browse and search your browsing history
- **Bookmarks** - Save and organize your favorite sites (soon)
- **Downloads Manager** - Track and manage file downloads (soon)

### ⚡ Performance
- **Lightweight** - Minimal footprint, maximum performance
- **Auto Updates** - Built-in update system keeps you current
- **Session Restore** - Tabs persist across browser restarts with lazy loading

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New Tab |
| `Ctrl+W` | Close Tab |
| `Ctrl+Tab` | Next Tab |
| `Ctrl+Shift+Tab` | Previous Tab |
| `Ctrl+L` | Focus URL Bar |
| `Ctrl+R` / `F5` | Reload |
| `Ctrl+Shift+R` | Hard Reload |
| `Alt+Left` | Back |
| `Alt+Right` | Forward |
| `Ctrl+H` | History |
| `Ctrl+Shift+B` | Toggle Bookmarks Bar |
| `Ctrl+Shift+I` | Developer Tools |
| `Escape` | Close Popups/Panels |

## Installation

### Download
Get the latest release from the [Releases](https://github.com/mathancy/Forge/releases) page:
- **Forge-Setup-x.x.x.exe** - Windows installer (recommended)
- **Forge-x.x.x.exe** - Portable version (no installation required)

### Build from Source

#### Prerequisites
- Node.js 18+
- npm or yarn

#### Setup

```bash
# Clone the repository
git clone https://github.com/mathancy/Forge.git
cd Forge

# Install dependencies
npm install

# Run in development mode (with DevTools)
npm run dev

# Run in production mode
npm start
```

#### Building

```bash
# Build for current platform
npm run build

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

## Project Structure

```
ForgeBrowser/
├── src/
│   ├── main/                        # Main process (Node.js)
│   │   ├── main.js                  # Main process entry point
│   │   ├── ad-blocker/              # Ad blocking engine
│   │   │   ├── index.js             # Ad blocker module exports
│   │   │   ├── ad-blocker.js        # Network request blocking
│   │   │   ├── cosmetic-injector.js # Element hiding CSS injection
│   │   │   └── script-injector.js   # Site-specific scripts (YouTube)
│   │   ├── auto-updater.js          # Update management
│   │   ├── bookmarks-service.js     # Bookmarks storage
│   │   ├── chrome-importer.js       # Chrome data import
│   │   ├── favorites-service.js     # Favorites management
│   │   ├── google-auth.js           # Google OAuth
│   │   ├── ai-service.js            # AI provider management
│   │   └── password-service.js      # Credential storage
│   ├── preload/
│   │   └── preload.js               # Secure IPC bridge
│   └── renderer/                    # Renderer process (Browser UI)
│       ├── index.html               # Main browser window
│       ├── styles.css               # Global styles
│       ├── renderer.js              # Main renderer orchestrator
│       ├── password-anvil/          # Password Anvil window
│       │   ├── index.html           # Password manager UI
│       │   └── password-anvil.js    # Password manager logic
│       └── modules/                 # Feature modules (mixins)
│           ├── ad-blocker.js        # Ad blocker UI integration
│           ├── ai-assistant.js      # AI sidebar panel
│           ├── bookmarks.js         # Bookmarks bar & management
│           ├── brightness-control.js # Brightness slider
│           ├── favorites.js         # Favorites bar
│           ├── history.js           # History panel
│           ├── keyboard-shortcuts.js # Keyboard shortcut handling
│           ├── modal-system.js      # Modal dialogs & notifications
│           ├── navigation.js        # URL processing, back/forward
│           ├── password-manager.js  # Password autofill integration
│           ├── tab-manager.js       # Tab creation, switching, drag & drop
│           ├── text-context-menu.js # Text selection context menu
│           ├── themes.js            # Theme management
│           ├── ui-panels.js         # Main menu, update panel
│           ├── url-suggestions.js   # URL autocomplete
│           ├── utils.js             # Utility functions
│           ├── webview-events.js    # Webview event handlers
│           ├── welcome-particles.js # Home page particle effects
│           └── window-controls.js   # Window minimize/maximize/close
├── assets/
│   ├── site-logos/                  # Favicon overrides for popular sites
│   ├── ui-icons/                    # UI icons (SVG)
│   └── forge-logo.ico               # App icon
├── filter-lists/                    # Ad blocking rules (JSON)
│   ├── default.json                 # Default filter list
│   ├── cosmetic-default.json        # Cosmetic filters
│   └── youtube.json                 # YouTube-specific rules
├── build/
│   └── afterPack.js                 # Post-build script
└── package.json
```

## Tech Stack

- **Electron 40** - Cross-platform desktop framework
- **Chromium** - Web rendering engine (via Electron)
- **Node.js** - Backend runtime
- **electron-builder** - Build and distribution
- **electron-updater** - Auto-update support

## Roadmap

- [x] Native ad-blocker with multiple filter lists
- [x] History panel
- [x] Password Manager with CSV import
- [x] AI Assistant integration
- [x] Favorites management
- [x] Auto-updater
- [x] Custom themes
- [x] Bookmarks management
- [x] Session restore with lazy tab loading
- [ ] Downloads manager
- [ ] Complete system-wide Settings panel
- [ ] User-created theme support
- [ ] Extensions/plugin support
- [ ] Sync across devices


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © 2026 Forgeworks Interactive Limited




