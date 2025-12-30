using System;
using System.Collections.Generic;
using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.JellyMix.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public int MaxTracksPerBlock { get; set; } = 50;
    
    public int DefaultDurationHours { get; set; } = 4;
    
    public int DefaultBlockCount { get; set; } = 3;
    
    public List<SavedPlaylistConfig> SavedPlaylists { get; set; } = new();
}

public class SavedPlaylistConfig
{
    public Guid PlaylistId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public List<Guid> LibraryIds { get; set; } = new();
    
    public List<string> SelectedGenres { get; set; } = new();
    
    public int DurationHours { get; set; }
    
    public int NumBlocks { get; set; }
    
    public int? YearStart { get; set; }
    
    public int? YearEnd { get; set; }
    
    public List<SavedBlockConfig> BlockConfigs { get; set; } = new();
    
    public List<Guid> MustHaveTrackIds { get; set; } = new();
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}

public class SavedBlockConfig
{
    public string Name { get; set; } = string.Empty;
    
    public List<GenreWeight> GenreWeights { get; set; } = new();
    
    public List<Guid> TrackIds { get; set; } = new();
}

public class GenreWeight
{
    public string Genre { get; set; } = string.Empty;
    
    public int Weight { get; set; }
}
