#!/bin/bash
set -euo pipefail

mkdir -p out

echo "Rendering FoundryDemo (text overlays, no voiceover)..."
npx remotion render src/index.ts FoundryDemo out/foundry-demo.mp4 \
  --codec h264 \
  --quality 80

echo "Done: out/foundry-demo.mp4"

# Uncomment when voiceover audio is ready:
# echo "Rendering FoundryDemoWithVoiceover..."
# npx remotion render src/index.ts FoundryDemoWithVoiceover out/foundry-demo-voiceover.mp4 \
#   --codec h264 \
#   --quality 80
# echo "Done: out/foundry-demo-voiceover.mp4"
