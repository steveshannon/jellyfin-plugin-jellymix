#!/bin/bash

# Build JellyMix Jellyfin Plugin

set -e

echo "Building JellyMix..."

cd "$(dirname "$0")"

dotnet restore
dotnet build -c Release

echo ""
echo "Build complete!"
echo ""
echo "Plugin files are in:"
echo "  Jellyfin.Plugin.JellyMix/bin/Release/net8.0/"
echo ""
echo "To install:"
echo "  1. Copy the contents to your Jellyfin plugins folder"
echo "  2. Create a subfolder called 'JellyMix'"
echo "  3. Restart Jellyfin"
echo ""
echo "Plugin folder locations:"
echo "  Linux:   /var/lib/jellyfin/plugins/JellyMix/"
echo "  Windows: %PROGRAMDATA%\\Jellyfin\\Server\\plugins\\JellyMix\\"
echo "  Docker:  /config/plugins/JellyMix/"
