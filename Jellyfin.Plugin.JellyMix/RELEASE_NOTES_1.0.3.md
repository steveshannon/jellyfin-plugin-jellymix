# JellyMix v1.0.3 Release Notes

## New Features

### 🎵 JellyMix Algorhythm - Artist Variety
- Each artist now appears only once per block
- Tries different genres before allowing artist repeats
- Graceful fallback if not enough unique artists available

### 📤 Share Playlist
- New "Share" button on Manage Lists tab
- Opens a beautiful printable page with full playlist details
- Shows blocks, tracks, genres (color-coded), durations
- Perfect for sharing setlists or printing for events
- Includes JellyMix branding and link

## Bug Fixes

### 🔀 Remix Block Fix
- Fixed issue accessing saved genre weights from config
- Checks multiple sources: sliders, state.blockConfigs, state.preview

## Installation

Update via Jellyfin plugin catalog, or manually replace the DLL and restart Jellyfin.

---

**Full Changelog:** https://github.com/steveshannon/jellyfin-plugin-jellymix/compare/v1.0.2...v1.0.3
