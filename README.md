# single-spa Inspector Pro

> 🚀 **This is a fork of [single-spa-inspector](https://github.com/single-spa/single-spa-inspector) with Manifest V3 support and enhanced features.**

---

## ✨ What's New in v3

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

**Workflow:**
1. Click **Edit** → Input becomes editable
2. Enter override URL → Click **Save & Refresh**
3. URL is saved, page refreshes, toggle turns ON
4. Use **Toggle** to quickly switch override on/off without re-entering URL

**Storage:** Override URLs are persisted in `browser.storage.local`, surviving browser restarts.

### 🗑️ Clear Cache & Refresh (v3.1.0)

**One-click cache clearing for micro-frontend development:**

- **Clear Cache Button** in the top-left corner of the Applications tab
- Clears HTTP cache, Service Worker cache, and Cache Storage
- Automatically refreshes the page after clearing
- Visual feedback: "Clearing..." → "✓ Cleared!" or "✗ Failed"

This feature is essential for micro-frontend development where you need to ensure fresh resources are loaded.

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
| **v3.1.0** | Clear Cache & Refresh feature; One-click cache clearing for micro-frontend development |
| **v3.0.0** | Manifest V3 support; Import Override Toggle UI; Storage persistence |
| v0.5.0 | Original version (Manifest V2) |

---

## 📖 Original Documentation

Below is the original README content from the upstream project.

---

# single-spa Devtools Inspector

A Firefox/Chrome devtools extension to provide utilities for helping with [single-spa](https://single-spa.js.org) applications.

[Full Documentation](https://single-spa.js.org/docs/devtools)

## Feature requests

If you would like to request a feature to be added, please open an issue with the title "Enhancement:"

---

## How to contribute

To fix a bug, add features, or just build the extension locally:

### Firefox

1. Install Firefox
1. [Create a FF profile](#create-a-firefox-dev-profile) called `single-spa-inspector-dev`. Alternatively, temporarily install the extension as documented in https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing.
1. Clone this repo
1. `nvm use` (ensures we're all using the same version of node)
1. `npm i`
1. `npm start`
1. Open devtools and navigate to the **single-spa Inspector** tab

#### Create a Firefox dev profile

Currently, development happens by default in Firefox. If you would like Firefox to remember any settings that you change to Firefox itself, this project is configured to use a profile called "single-spa-inspector-dev". To create this profile, go to [about:profiles](about:profiles). Firefox will use that profile and remember any changes you make (e.g. devtools location, devtools dark mode, etc.)

#### Debugging

Once single-spa Inspector is running, open a new tab and navigate to [about:debugging](about:debugging). single-spa Inspector should be listed as a Temporary Extension, and a "Debug" control should be displayed. Click on this to enable devtools for the extension. In the upper-right corner, click on the divided square icon next to the 3-dot menu, and select `/build/panel.html` as the target. You can now inspect the inspector UI as you would a normal webpage.

### Chrome

1. Install Chrome
1. Create a Chrome profile

   - This process is somewhat convoluted but needed in order to save preferences and any additional extensions
   - Before starting any processes, open the Chrome Profiles directory
     - Mac: `~/Library/Application Support/Google/Chrome`
     - Windows: `%LOCALAPPDATA%\Google\Chrome\User Data`
     - See the [Chromium User Data Directory docs](https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md) for other platforms/chrome builds
   - In that folder, take note of the Profile folders (eg. named "Profile 1", "Profile 2", etc. on Mac)
   - Open Chrome and [add a new profile](https://support.google.com/chrome/answer/2364824)
   - Return to the Chrome user data folder and locate the newly created Profile folder
   - Rename the folder to "single-spa-inspector-dev" (for convenience)
   - Copy the file path for this profile folder

1. Start Chrome with `$CHROME_PROFILE_PATH` env set to the profile folder path

   ```sh
   # for Mac
   CHROME_PROFILE_PATH="~/Library/Application Support/Google/Chrome/single-spa-inspector-dev" npm run start:chrome
   ```

#### Debugging

- Open single-spa inspector in devtools
- Right-click on any element inside of the inspector, and click "Inspect"
- A new instance of devtools will appear to inspect the devtools DOM

---

### Publishing a New Version

1. Update the version in `manifest.json` and `package.json` (they should match)
1. Ensure that the necessary Firefox env values are in your local .env

   ```
   WEXT_SHIPIT_FIREFOX_JWT_ISSUER=xxxxx
   WEXT_SHIPIT_FIREFOX_JWT_SECRET=xxxxx
   ```

1. Ensure that the necessary Chrome env values are in your local .env

   ```sh
   WEXT_SHIPIT_CHROME_EXTENSION_ID=xxxxx
   WEXT_SHIPIT_CHROME_CLIENT_ID=xxxxx
   WEXT_SHIPIT_CHROME_CLIENT_SECRET=xxxxx
   WEXT_SHIPIT_CHROME_REFRESH_TOKEN=xxxxx
   ```

1. Run `npm run deploy`

- Alternatively, to deploy individual browsers you can run `npm run deploy:firefox` or `npm run deploy:chrome`

You may also want to verify the status at the respective extensions page

- [Firefox Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/)
- [Chrome Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

---

## Thanks

- Built with [web-ext](https://github.com/mozilla/web-ext) which makes for a better dev experience
- Uses [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) to make cross-platform dev easier
- [React Devtools](https://github.com/facebook/react-devtools) for showing how to do some of these things
- And [CanopyTax](https://www.canopytax.com) for indirectly funding this :)
