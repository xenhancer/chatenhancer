# Chat Enhancer

> A browser extension that enhances AI chat interfaces with collapsible answers, quick controls, and improved navigation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange?logo=firefox)](https://addons.mozilla.org)

## ✨ Features

- **Collapsible Answers** - Click on any question to expand/collapse its answer
- **Expand/Collapse All** - Quick buttons to control all answers at once
- **Turn Counter** - See how many conversation turns you've had
- **Draggable Panel** - Reposition the control panel anywhere on the page
- **Lightweight** - No external dependencies, pure JavaScript
- **Privacy-First** - No data collection, no external API calls, runs entirely locally

## 🚀 Installation

### From Browser Stores (Recommended)

- **Chrome/Edge/Brave**: [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org) (coming soon)

### Manual Installation (Development)

#### Chrome / Chromium / Edge

1. Open Chrome (or Chromium/Edge)
2. Go to `chrome://extensions/` (or `edge://extensions/` for Edge)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select this folder (the one containing `manifest.json`)
6. Open `https://chat.openai.com` or `https://chatgpt.com`
   - After the page loads, you should see a **"Chat Enhancer"** panel near the bottom-right

> **Note**: The extension will remain loaded until you remove it manually. For development, click the refresh icon on the extension card after making changes.

#### Firefox

1. Open Firefox
2. Go to `about:debugging`
3. Click **This Firefox** in the left sidebar
4. Click **Load Temporary Add-on…**
5. Select the `manifest.json` file from this folder
6. Open `https://chat.openai.com` or `https://chatgpt.com`
   - After the page loads, you should see a **"Chat Enhancer"** panel near the bottom-right

> **Note**: Temporary extensions are removed when you close Firefox. For development, just re-load it via **Load Temporary Add-on…**.

## 📖 Usage

Once installed, the extension automatically activates on supported AI chat pages. You'll see a floating panel in the bottom-right corner with:

- **Turn Counter** - Shows the number of conversation turns
- **Expand All** - Expands all collapsed answers
- **Collapse All** - Collapses all answers

### Collapsible Answers

- Click on any question bubble to toggle its answer visibility

### Draggable Panel

- Click and drag the panel header to reposition it anywhere on the page
- The position is maintained during your session

## 🛠️ Development

### Project Structure

```
chatenhancer/
├── manifest.json          # Extension manifest
├── content-script.js      # Main extension logic
├── icons/                 # Extension icons
│   ├── icon-48.png
│   ├── icon-96.png
│   └── icon.svg
└── README.md
```

### Customization

The extension logic is in `content-script.js`. Key functions:

- `createPanel()` - Creates the floating UI panel
- `setupCollapsibleAnswers()` - Sets up collapsible answer functionality
- `expandAllAnswers()` / `collapseAllAnswers()` - Control all answers
- `updateRoundsCount()` - Updates the turn counter
- `attachBehavior()` - Attaches event handlers

You can:
- Modify the UI in `createPanel()` (HTML and inline styles)
- Add new buttons and functionality in `attachBehavior()`
- Change element selectors to match the target chat interface's DOM structure
- Customize the collapsible behavior in `setupCollapsibleAnswers()`

No build step required - just edit files and reload the extension.

### Building for Distribution

Use the included packaging script:

```bash
./package.sh
```

This creates a zip file ready for submission to browser stores.

## 🤝 Contributing

Contributions are welcome! This is an open source project, and we appreciate any help.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on both Chrome and Firefox
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub with:
- Description of the issue/feature
- Steps to reproduce (for bugs)
- Browser and version
- Screenshots if applicable

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🔒 Privacy

This extension:
- ✅ Runs entirely locally in your browser
- ✅ Does not collect any data
- ✅ Does not make external API calls
- ✅ Only runs on specified chat domains (currently `chat.openai.com` and `chatgpt.com`)
- ✅ Does not transmit any information

Your conversations and data remain completely private.

## 🙏 Acknowledgments

- Built for the AI chat community
- Inspired by the need for better conversation navigation

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Documentation](https://extensionworkshop.com/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**Note**: This extension is not affiliated with, endorsed by, or connected to any AI chat service providers. It is an independent, community-driven project.
