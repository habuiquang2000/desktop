#!/usr/bin/env bash
# Compiles and builds the production standalone binary for GitHub Desktop.
set -euo pipefail

echo -e "\033[1;36m=== GitHub Desktop: Production Builder ===\033[0m"

# Ensure dependencies exist
if [ ! -d "node_modules" ]; then
    echo -e "\033[1;33mInstalling dependencies with npm ci...\033[0m"
    npm ci
fi

echo -e "\033[1;33mCompiling and building production app...\033[0m"
npm run build:prod

echo -e "\n\033[1;32mBuild complete!\033[0m"
echo -e "\033[1;36mArtifacts generated in ./dist/\033[0m"
