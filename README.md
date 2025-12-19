# single-spa Inspector Pro

> 🚀 **This is a fork of [single-spa-inspector](https://github.com/single-spa/single-spa-inspector) with Manifest V3 support and enhanced features.**

---

## ✨ What's New in Pro

### 🔧 Manifest V3 Support

- **Full Manifest V3 compatibility** for both Chrome and Firefox
- Chrome uses Service Worker for background scripts
- Firefox uses background scripts with module type
- Updated `webextension-polyfill` to v0.12.0 for better MV3 support

### 🎛️ Import Override Toggle Feature

**New UI for Import Map Overrides:**

| Component | Description |
|-----------|-------------|
| **Toggle Switch** | Quickly enable/disable saved override URLs |
| **Readonly Input** | Display saved override URL |
| **Edit Button** | Enter edit mode to modify URL |
| **Save & Refresh** | Save URL and refresh page (in edit mode) |
| **Cancel** | Cancel editing (in edit mode) |
| **Export Button** (v3.2.0) | Export all saved overrides to JSON file (alphabetically sorted) |
| **Import Button** (v3.2.0) | Import overrides from JSON file with validation |
| **Sort by** (v3.2.0) | Toggle between AppName (A-Z) and Status sorting |

**Workflow:**
1. Click **Edit** → Input becomes editable
2. Enter override URL → Click **Save & Refresh**
3. URL is saved, page refreshes, toggle turns ON
4. Use **Toggle** to quickly switch override on/off without re-entering URL
5. **Export** all saved overrides to `single-spa-override-urls.json`
6. **Import** from JSON file to batch configure overrides (disabled by default)

**Storage:** Override URLs are persisted in `browser.storage.local`, surviving browser restarts.

### 🗑️ Clear Cache & Refresh (v3.1.0+)

**One-click cache clearing for micro-frontend development:**

- **Clear Cache Button** with beautiful gradient colors and animations
- Clears HTTP cache, Service Worker cache, and Cache Storage
- Automatically refreshes the page after clearing
- Visual feedback with animations: "Clearing..." → "Cleared!" or "Failed"

This feature is essential for micro-frontend development where you need to ensure fresh resources are loaded.

### 🔄 Auto-Recovery & Real-time Status (v3.1.2)

**Improved connection stability and status synchronization:**

- **Auto-reconnect on port disconnect**: When the background service worker is terminated or the connection is lost, the panel automatically detects and reconnects
- **Page visibility recovery**: When the inspected page returns from BFCache or becomes visible again, routing events are re-dispatched to ensure status is up-to-date
- **Panel visibility recovery**: When switching back to the Inspector panel after viewing other DevTools tabs, the connection is re-established and apps status is refreshed
- **Stale detection fallback**: If no updates are received for 12+ seconds, the panel proactively fetches the latest status
- **Visual feedback**: "Connection lost, auto-retrying..." indicator when reconnection is in progress
- **Thorough localStorage cleanup**: Reset All and individual override clearing now directly remove `import-map-override:*` keys from localStorage, ensuring complete cleanup even when `importMapOverrides` API is unavailable

### 🎨 Overlays Feature (v3.1.2)

**Visual highlighting for mounted micro-frontend applications:**

- **Off**: No overlays displayed
- **On**: Show overlays on all mounted applications
- **List Hover**: Show overlay only when hovering over an app in the list

The overlays use the standard `#single-spa-application:<app-name>` container as the default target, and automatically resize when the container dimensions change. Custom overlay selectors can be configured via `app.devtools.overlays.selectors`.

### 📦 Build Improvements

- Separate build scripts for Chrome and Firefox
- Updated `web-ext` to v9.x for MV3 validation
- Improved build configuration

---

## ⚠️ Permissions Notice

### Chrome: Local Network Access Permission

When using **localhost override URLs** (e.g., `http://localhost:9200/app.js`), Chrome will prompt for **"Local Network Access"** permission. This is a security feature in Chrome's Manifest V3 - the extension needs explicit permission to access local network resources.

**To grant permission:**
1. Click the permission prompt when it appears
2. Or go to `chrome://extensions/` → single-spa Inspector Pro → "Site access" settings

This is normal and required for local development overrides to work.

---

## 📥 Installation

### From Release (Recommended)

Download the latest release:
- **Chrome**: `single-spa-inspector-pro-chrome-{version}.zip`
- **Firefox**: `single-spa-inspector-pro-firefox-{version}.zip`

**Chrome Installation:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Drag and drop the zip file, or unzip and "Load unpacked"

**Firefox Installation:**

> ⚠️ **Note**: Standard Firefox requires add-ons to be digitally signed by Mozilla. Locally built extensions cannot be installed directly. Use one of the following methods:

**Method 1: Use Firefox Developer Edition or Nightly (Recommended for development)**
1. Download [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/) or [Firefox Nightly](https://www.mozilla.org/firefox/nightly/)
2. Type `about:config` in the address bar and press Enter
3. Click "Accept the Risk and Continue"
4. Search for `xpinstall.signatures.required`
5. Set it to `false`
6. Then open `about:addons` → Click gear icon → "Install Add-on From File..." → Select the zip file

**Method 2: Temporary Loading (Simplest, but resets after restart)**
1. Type `about:debugging` in Firefox address bar
2. Click "This Firefox" on the left
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file in the extension directory

### Build from Source

```bash
# Install dependencies
npm install

# Build for Firefox
export NODE_OPTIONS=--openssl-legacy-provider
npm run build:firefox

# Build for Chrome
export NODE_OPTIONS=--openssl-legacy-provider
npm run build:chrome
```

Output files will be in `web-ext-artifacts/` directory.

---

## 🔄 Changelog

| Version | Changes |
|---------|---------|
| **v3.2.0** | **Import/Export Override URLs**: Export saved overrides to JSON (alphabetically sorted), import from JSON file with validation; **Sort by AppName/Status**: New sort options in toolbar to organize applications list; **Enhanced Clear Button**: Beautiful gradient colors and smooth animations for all button states (default, hover, clearing, success, error) |
| **v3.1.3** | Fixed "Extension context invalidated" errors during rapid subapp switching; Added graceful error handling for Service Worker lifecycle in MV3 |
| **v3.1.2** | Auto-recovery & real-time status: auto-reconnect on port disconnect, page/panel visibility recovery, stale detection fallback, thorough localStorage cleanup for import-map-overrides; Restored Overlays feature: fixed overlay helpers not being invoked after MV3 refactor; now uses ResizeObserver and default single-spa container fallback |
| **v3.1.0** | Clear Cache & Refresh feature; One-click cache clearing for micro-frontend development |
| **v3.0.0** | Manifest V3 support; Import Override Toggle UI; Storage persistence |
| v0.5.0 | Original version (Manifest V2) |
