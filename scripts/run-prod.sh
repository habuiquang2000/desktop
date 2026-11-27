#!/usr/bin/env bash
# Runs the built production executable of GitHub Desktop.
set -euo pipefail

APP=$(find dist -type f -name "GitHubDesktop" -o -name "GitHubDesktop.exe" 2>/dev/null | head -n 1)

if [ -z "$APP" ]; then
    echo -e "\033[1;31mNo production executable found in dist/. Run ./scripts/build-prod.sh first.\033[0m"
    exit 1
fi

echo -e "\033[1;32mLaunching GitHub Desktop ($APP)...\033[0m"
"$APP" &
