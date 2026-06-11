#!/bin/bash
set -euo pipefail

mkdir -p out

# Prefer the package's real CLI entrypoint (the .bin/remotion npx shim is broken
# in some checkouts); fall back to npx where the shim works.
if [ -f node_modules/@remotion/cli/remotion-cli.js ]; then
  REMOTION=(node node_modules/@remotion/cli/remotion-cli.js)
else
  REMOTION=(npx remotion)
fi

echo "Rendering FoundryDemoWithVoiceover..."
"${REMOTION[@]}" render src/index.ts FoundryDemoWithVoiceover out/foundry-demo-voiceover.mp4 \
  --codec h264 \
  --quality 80

echo "Done: out/foundry-demo-voiceover.mp4"
