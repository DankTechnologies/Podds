#!/bin/bash
pnpm run build
npx wrangler pages deploy build --project-name podds --commit-dirty