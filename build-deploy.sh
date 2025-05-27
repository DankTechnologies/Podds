#!/bin/bash

# Get version from git tag or package.json
VERSION=$(git describe --tags --abbrev=0 2>/dev/null || node -p "require('./package.json').version")
echo "Building version: $VERSION"

# Build with version
VITE_APP_VERSION=$VERSION pnpm run build

# Deploy to Cloudflare
npx wrangler pages deploy build --project-name podds --commit-dirty