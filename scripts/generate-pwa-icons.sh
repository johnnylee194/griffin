#!/bin/bash

# Generate PWA icons from SVG
# This script creates placeholder icons for PWA

cd "$(dirname "$0")/../frontend/public"

# Create a simple placeholder icon using ImageMagick
# If you have griffin-icon.svg, you can convert it to PNG

SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  # Create a simple colored square as placeholder
  # Gold color (#d4af37) with Griffin text
  convert -size ${size}x${size} \
    xc:"#1a1a1a" \
    -fill "#d4af37" \
    -gravity center \
    -pointsize $((size / 4)) \
    -annotate +0+0 "🦅" \
    "icon-${size}x${size}.png"
  
  echo "Generated icon-${size}x${size}.png"
done

echo "✅ All PWA icons generated!"

