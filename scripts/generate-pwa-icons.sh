#!/bin/bash

# Generate PWA icons from SVG
# This script creates placeholder icons for PWA

cd "$(dirname "$0")/../frontend/public"

# Create a simple placeholder icon using ImageMagick
# If you have griffin-icon.svg, you can convert it to PNG

SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  # Create a golden griffin icon with dark background
  # Background: dark (#1a1a1a), Icon: gold (#d4af37)
  convert -size ${size}x${size} \
    -background "#1a1a1a" \
    -fill "#d4af37" \
    -font "DejaVu-Sans" \
    -gravity center \
    -pointsize $((size * 6 / 10)) \
    label:"🦅" \
    "icon-${size}x${size}.png"
  
  echo "Generated icon-${size}x${size}.png"
done

echo "✅ All PWA icons generated!"

