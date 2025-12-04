#!/bin/bash
# Package the extension for distribution

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
ZIP_NAME="chatenhancer-v${VERSION}.zip"

echo "Packaging Chat Enhancer v${VERSION}..."

# Remove old zip if exists
rm -f "$ZIP_NAME" *.zip

# Create zip with only necessary files
zip -r "$ZIP_NAME" \
  manifest.json \
  content-script.js \
  icons/ \
  README.md \
  -x "*.git*" "*.zip" "generate_icons.html" "create_icons.py" "package.sh" "PRE_PUBLISH_CHECKLIST.md" ".gitignore"

echo ""
echo "✅ Package created: $ZIP_NAME"
echo ""
echo "Files included:"
unzip -l "$ZIP_NAME" | tail -n +4 | head -n -2

