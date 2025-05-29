#!/bin/bash

# Get version from git tag or package.json
VERSION=$(git describe --tags --abbrev=0 2>/dev/null || node -p "require('./package.json').version")
echo "Building preview version: $VERSION"

# Build with version
VITE_APP_VERSION=$VERSION pnpm run build

# Start preview server
pnpm run preview --host 0.0.0.0