#!/usr/bin/env bash
# Packages GitHub Desktop into a distributable product installer.
set -euo pipefail

echo -e "\033[1;36m=== GitHub Desktop: Product Packager ===\033[0m"

# 1. Ensure build exists
if [ ! -d "dist" ] || [ -z "$(find dist -maxdepth 1 -type d -name 'GitHubDesktop-*' 2>/dev/null)" ]; then
    echo -e "\033[1;33m[1/2] Production build not found in dist/. Building now...\033[0m"
    npm run build:prod
else
    echo -e "\033[1;32m[1/2] Existing production build found in dist/.\033[0m"
fi

# 2. Package into installer
echo -e "\033[1;33m[2/2] Generating product installer and distribution packages...\033[0m"
npm run package

echo -e "\n\033[1;32mPackaging complete! Distributables generated in ./dist/\033[0m"
find dist -maxdepth 2 -type f \( -name "*.exe" -o -name "*.msi" -o -name "*.zip" -o -name "*.nupkg" \) -exec ls -lh {} +
