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
- **Session Restore** - Tabs persist across browser restarts (soon)

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
│   ├── main/
│   │   ├── main.js              # Main process entry
│   │   ├── ad-blocker/          # Ad blocking engine
│   │   ├── auto-updater.js      # Update management
│   │   └── password-manager.js  # Credential storage
│   ├── preload/
│   │   └── preload.js           # Secure IPC bridge
│   └── renderer/
│       ├── index.html           # Browser UI
│       ├── styles.css           # Styling
│       ├── renderer.js          # Main renderer logic
│       └── modules/             # Feature modules
│           ├── ad-blocker.js
│           ├── ai-assistant.js
│           ├── password-manager.js
│           └── ui-panels.js
├── assets/
│   ├── forge-logo.ico           # App icon
│   └── filter-lists/            # Ad blocking rules
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
- [ ] Bookmarks management
- [ ] Downloads manager
- [ ] Restore tabs on session restart
- [ ] Complete system-wide Settings panel
- [ ] User-created theme support
- [ ] Extensions/plugin support
- [ ] Sync across devices


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © 2026 Forgeworks Interactive Limited




