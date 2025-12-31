<p align="center">
  <img src="Jellyfin.Plugin.JellyMix/jellyfin-plugin-jellymix.png" alt="JellyMix Logo" width="200">
</p>

<h1 align="center">JellyMix</h1>

<p align="center">
  <strong>Create segmented playlists with genre weighting for Jellyfin</strong>
</p>

<p align="center">
  <a href="https://github.com/steveshannon/jellyfin-plugin-jellymix/releases/latest">
    <img src="https://img.shields.io/github/v/release/steveshannon/jellyfin-plugin-jellymix?style=flat-square" alt="Latest Release">
  </a>
  <a href="https://github.com/steveshannon/jellyfin-plugin-jellymix/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/steveshannon/jellyfin-plugin-jellymix?style=flat-square" alt="License">
  </a>
  <a href="https://jellymix.org">
    <img src="https://img.shields.io/badge/website-jellymix.org-blue?style=flat-square" alt="Website">
  </a>
</p>

---

JellyMix is a Jellyfin plugin that creates smart, block-based playlists from your music library. Instead of a random shuffle, JellyMix lets you control the genre mix across different sections of your playlist — perfect for parties, DJ sets, background music, or themed listening sessions.

## Features

🎚️ **Genre Sliders** — Control the mix for each block with intuitive sliders (0-100%)

⭐ **Must-Have Tracks** — Search by title and artist to guarantee specific songs make the cut

🔀 **Remix Blocks** — Re-roll individual sections without regenerating the entire playlist

✏️ **Edit Anytime** — Return to saved playlists, reorder tracks, and refine your mix

🎨 **Smart Block Names** — Automatic themed names like "Opener", "Peak", and "Closer"

📅 **Year Filtering** — Create era-specific playlists (e.g., 1955-1970 for vintage tracks)

🖼️ **Custom Artwork** — Playlists get the JellyMix logo automatically

## Screenshots

<p align="center">
  <img src="https://jellymix.org/help/01_jellymix_create.png" alt="Create List" width="800">
  <br><em>Select libraries, genres, and configure your playlist</em>
</p>

<p align="center">
  <img src="https://jellymix.org/help/02_jellymix_sliders.png" alt="Genre Sliders" width="800">
  <br><em>Adjust genre weights for each block</em>
</p>

<p align="center">
  <img src="https://jellymix.org/help/03_jellymix_playlist.png" alt="Preview" width="800">
  <br><em>Preview, remix, and add must-have tracks</em>
</p>

<p align="center">
  <img src="https://jellymix.org/help/05_jellymix_manage.png" alt="Manage Lists" width="800">
  <br><em>Manage your JellyMix playlists</em>
</p>

## Installation

### From Plugin Catalog (Recommended)

1. In Jellyfin, go to **Dashboard → Plugins → Repositories**
2. Click **Add** and enter:
   ```
   https://jellymix.org/manifest.json
   ```
3. Go to **Catalog**, find **JellyMix**, and click **Install**
4. Restart Jellyfin

### Manual Installation

1. Download the latest release from the [Releases](https://github.com/steveshannon/jellyfin-plugin-jellymix/releases) page
2. Extract to your Jellyfin plugins directory:
   - Docker: `/config/data/plugins/JellyMix_1.0.2.0/`
   - Linux: `/var/lib/jellyfin/plugins/JellyMix_1.0.2.0/`
   - Windows: `C:\ProgramData\Jellyfin\Server\plugins\JellyMix_1.0.2.0\`
3. Restart Jellyfin

## Usage

1. Open Jellyfin and navigate to **Plugins → JellyMix** in the sidebar
2. **Select Libraries** — Choose which music libraries to include
3. **Choose Genres** — Optionally filter to specific genres
4. **Set Options** — Duration (1-12 hours), number of blocks (1-5), year range
5. **Configure Blocks** — Adjust genre sliders for each block's mix
6. **Conjure Playlist** — Generate your playlist preview
7. **Refine** — Drag to reorder, delete tracks, remix blocks, add must-haves
8. **Save** — Save to your Jellyfin library with custom artwork

For detailed instructions, visit the [Help Page](https://jellymix.org/help).

## How It Works

JellyMix divides your playlist into **blocks** — distinct sections that can each have a different genre mix. This lets you create playlists that evolve over time:

- **Opener** — Start mellow with ambient or chill tracks
- **Building** — Gradually increase energy
- **Peak** — Hit the high point with upbeat selections
- **Wind Down** — Ease back to a relaxed vibe
- **Closer** — End on just the right note

Each block's genre sliders control the probability of selecting tracks from that genre. A slider at 100 means heavy emphasis; at 0, that genre is excluded from the block.

## Requirements

- Jellyfin Server 10.11.0 or later
- Music libraries with genre metadata

## Support

- 📖 [Documentation](https://jellymix.org/help)
- 🐛 [Report Issues](https://github.com/steveshannon/jellyfin-plugin-jellymix/issues)
- ☕ [Buy Me a Coffee](https://www.buymeacoffee.com/ohmybabycats)

## License

This project is licensed under the [GPL-2.0 License](LICENSE).

---

<p align="center">
  Made with 🎵 for the Jellyfin community
</p>
