## ChatGPT Page Enhancer (Chrome & Firefox Extension)

This is a browser extension that adds extra UI and functionality on the ChatGPT website (`chat.openai.com` / `chatgpt.com`). It works in both **Chrome** and **Firefox**.

By default it:
- **Shows a small floating panel** in the bottom-right corner on ChatGPT.
- **Makes answers collapsible** - click on any question to expand/collapse its answer.
- **Adds "Expand All" and "Collapse All" buttons** to control all answers at once.
- **Displays turn counter** showing how many conversation turns you've had.
- **Draggable panel** - drag the header to reposition the panel.

You can freely customize the behavior in `content-script.js`.

---

### Load the extension (temporary install)

#### Chrome / Chromium / Edge

1. Open Chrome (or Chromium/Edge).
2. Go to `chrome://extensions/` (or `edge://extensions/` for Edge).
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select this folder (the one containing `manifest.json`).
6. Open `https://chat.openai.com` (or `https://chatgpt.com`).  
   - After the page loads, you should see a **"ChatGPT Enhancer"** bubble near the bottom-right.

> Note: The extension will remain loaded until you remove it manually or reload the page. For development, click the refresh icon on the extension card after making changes.

#### Firefox

1. Open Firefox.
2. Go to `about:debugging`.
3. Click **This Firefox** in the left sidebar.
4. Click **Load Temporary Add-on…**.
5. Select the `manifest.json` file from this folder.
6. Open `https://chat.openai.com` (or `https://chatgpt.com`).  
   - After the page loads, you should see a **"ChatGPT Enhancer"** bubble near the bottom-right.

> Note: Temporary extensions are removed when you close Firefox. For development, just re-load it via **Load Temporary Add-on…**.

---

### Customizing what it does

The injected logic lives in `content-script.js`. It currently:

- Waits for the ChatGPT input textarea to appear.
- Creates a small floating UI panel (`createPanel`).
- Sets up collapsible answers (`setupCollapsibleAnswers`).
- Attaches behavior to:
  - Expand/collapse all answers (`expandAllAnswers`, `collapseAllAnswers`).
  - Toggle panel visibility (`attachBehavior`).
  - Make panel draggable.
  - Update turn counter (`updateRoundsCount`).

You can:

- **Change the UI** inside `createPanel()` (HTML and inline styles).
- **Add new buttons** and attach JS logic in `attachBehavior()`.
- **Change targeting** of ChatGPT elements (e.g., which selector is used to find answers).
- **Modify collapsible behavior** in `setupCollapsibleAnswers()`.

No build step is required; you edit files and re-load the extension.

---

### Optional: Adding Icons

If you want to add extension icons, create an `icons/` directory and add:
- `icon-48.png` (48x48 pixels)
- `icon-96.png` (96x96 pixels)

Then add this to your `manifest.json`:
```json
"icons": {
  "48": "icons/icon-48.png",
  "96": "icons/icon-96.png"
}
```

---

### Packaging for distribution

#### Chrome Web Store

1. Create a zip file containing:
   - `manifest.json`
   - `content-script.js`
   - `icons/` directory (optional, if you added icons)
   - Any other required files
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Upload the zip file and follow the submission process.

#### Firefox Add-ons (AMO)

1. Make sure your `manifest.json` has a unique `browser_specific_settings.gecko.id`.
2. Create a zip file containing:
   - `manifest.json`
   - `content-script.js`
   - `icons/` directory (optional, if you added icons)
   - Any other required files
3. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
4. Submit the zip file for signing/review.

> Note: The `browser_specific_settings` field in the manifest is ignored by Chrome, so the same manifest.json works for both browsers. However, you may want to create separate builds if you need browser-specific features.

Refer to the official documentation for the latest details on publishing extensions:
- [Chrome Extension Publishing](https://developer.chrome.com/docs/webstore/publish/)
- [Firefox Extension Publishing](https://extensionworkshop.com/documentation/publish/)


