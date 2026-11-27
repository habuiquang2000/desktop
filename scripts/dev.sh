#!/usr/bin/env bash
# Starts GitHub Desktop in development mode with live compilation.
set -euo pipefail

echo -e "\033[1;36m=== GitHub Desktop: Development Launcher ===\033[0m"

# 1. Verify dependencies
if [ ! -d "node_modules" ]; then
    echo -e "\033[1;33m[1/3] node_modules not found. Running npm ci...\033[0m"
    npm ci
else
    echo -e "\033[1;32m[1/3] Dependencies found.\033[0m"
fi

# 2. Build dev assets
echo -e "\033[1;33m[2/3] Building development assets...\033[0m"
npm run build:dev

# 3. Start development server & app
echo -e "\033[1;33m[3/3] Starting development app with live reload...\033[0m"
echo -e "\033[1;36mTip: Press Ctrl+Alt+R to reload the UI. Press Ctrl+Shift+I for DevTools.\033[0m"
npm start
