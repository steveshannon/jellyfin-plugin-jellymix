# JellyMix - Jellyfin Plugin

Create segmented playlists with genre weighting — like programming a radio station.

🌐 **Website:** [jellymix.org](https://jellymix.org)  
📦 **Plugin Repo:** `https://jellymix.org/manifest.json`  
🐛 **Issues:** [GitHub Issues](https://github.com/sshannon/jellymix/issues)

## Features

- **Multi-library support** — Select tracks from one or more music libraries
- **Genre filtering** — Choose specific genres or use all available
- **Date range filtering** — Filter tracks by year (e.g., 1955-1970)
- **Block programming** — Divide your playlist into segments with different genre mixes
- **Visual sliders** — Intuitive 5-position sliders (0% / 25% / 50% / 75% / 100%)
- **Preview & edit** — See your playlist before saving
- **Drag to reorder** — Move tracks within or between blocks
- **Must-haves** — Add specific tracks marked with ⭐
- **Remix blocks** — Regenerate individual blocks with same settings

## Installation

### Easy Install (Recommended)

1. In Jellyfin, go to **Dashboard → Plugins → Repositories**
2. Click **Add** and enter: `https://jellymix.org/manifest.json`
3. Go to **Catalog** and find **JellyMix**
4. Click **Install**
5. Restart Jellyfin

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/sshannon/jellymix/releases)
2. Extract to your Jellyfin plugins folder:
   - Linux: `/var/lib/jellyfin/plugins/JellyMix/`
   - Windows: `%PROGRAMDATA%\Jellyfin\Server\plugins\JellyMix\`
   - Docker: `/config/plugins/JellyMix/`
3. Restart Jellyfin
4. Access via **Dashboard → Plugins → JellyMix**

### Building from Source

Requirements:
- .NET 8.0 SDK
- Jellyfin Server 10.10.0+

```bash
git clone https://github.com/sshannon/jellymix.git
cd jellymix
dotnet build -c Release
```

The compiled plugin will be in `Jellyfin.Plugin.JellyMix/bin/Release/net8.0/`.

## Usage

### Create a Playlist

1. **Setup**
   - Enter a playlist name
   - Select one or more music libraries
   - (Optional) Filter by genres
   - (Optional) Set date range
   - Choose duration (1-8 hours)
   - Choose number of blocks (1-5)

2. **Configure Blocks**
   - Name each block (defaults: Opener, Building, Peak, Wind Down, Closer)
   - Adjust genre sliders for each block
   - Higher slider = more of that genre

3. **Preview & Edit**
   - Review generated playlist
   - Drag tracks to reorder
   - Add must-have tracks (⭐)
   - Remix individual blocks
   - Delete unwanted tracks

4. **Save**
   - Save to Jellyfin as a standard playlist

### Manage Playlists

- View all playlists
- Delete playlists

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/JellyMix/Libraries` | GET | List music libraries |
| `/JellyMix/Genres` | GET | Get genres from selected libraries |
| `/JellyMix/Generate` | POST | Generate playlist preview |
| `/JellyMix/RemixBlock` | POST | Regenerate a single block |
| `/JellyMix/Search` | GET | Search for tracks |
| `/JellyMix/Save` | POST | Save playlist to Jellyfin |
| `/JellyMix/Playlists` | GET | List user's playlists |
| `/JellyMix/Playlists/{id}` | DELETE | Delete a playlist |

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

## License

GPL-2.0 — see [LICENSE](LICENSE)

## Author

Steve Shannon (shannonsteved@gmail.com)
