using System.Globalization;

namespace Jellyfin.Plugin.JellyMix.Api;

public class BlockConfig
{
    public string Name { get; set; } = string.Empty;
    
    public Dictionary<string, int> GenreWeights { get; set; } = new();
    
    public Guid[] TrackIds { get; set; } = [];
}

public class GeneratePlaylistRequest
{
    public string Name { get; set; } = string.Empty;
    
    public Guid[] LibraryIds { get; set; } = [];
    
    public string[] Genres { get; set; } = [];
    
    public int? YearStart { get; set; }
    
    public int? YearEnd { get; set; }
    
    public int DurationMinutes { get; set; }
    
    public BlockConfig[] Blocks { get; set; } = [];
    
    public Guid UserId { get; set; }
}

public class RemixBlockRequest
{
    public int BlockIndex { get; set; }
    
    public BlockConfig BlockConfig { get; set; } = new();
    
    public Guid[] LibraryIds { get; set; } = [];
    
    public string[]? Genres { get; set; }
    
    public int? YearStart { get; set; }
    
    public int? YearEnd { get; set; }
    
    public int DurationMinutes { get; set; }
}

public class TrackInfo
{
    public Guid Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public string Artist { get; set; } = string.Empty;
    
    public string Album { get; set; } = string.Empty;
    
    public string Genre { get; set; } = string.Empty;
    
    public long DurationTicks { get; set; }
    
    public int? Year { get; set; }
    
    public bool IsMustHave { get; set; }
    
    public string DurationDisplay => TimeSpan.FromTicks(DurationTicks).ToString(@"m\:ss", CultureInfo.InvariantCulture);
}

public class BlockResult
{
    public string Name { get; set; } = string.Empty;
    
    public Dictionary<string, int> GenreWeights { get; set; } = new();
    
    public List<TrackInfo> Tracks { get; set; } = [];
    
    public long TotalDurationTicks { get; set; }
    
    public string DurationDisplay => TimeSpan.FromTicks(TotalDurationTicks).ToString(@"h\:mm\:ss", CultureInfo.InvariantCulture);
}

public class PlaylistPreview
{
    public string Name { get; set; } = string.Empty;
    
    public List<BlockResult> Blocks { get; set; } = [];
    
    public int TotalTracks => Blocks.Sum(b => b.Tracks.Count);
    
    public long TotalDurationTicks { get; set; }
    
    public string DurationDisplay => TimeSpan.FromTicks(TotalDurationTicks).ToString(@"h\:mm\:ss", CultureInfo.InvariantCulture);
}

public class SavePlaylistRequest
{
    public string Name { get; set; } = string.Empty;
    
    public Guid[] TrackIds { get; set; } = [];
    
    public Guid UserId { get; set; }
    
    public Guid? ExistingPlaylistId { get; set; }
    
    public PlaylistConfigData? Config { get; set; }
    
    public Guid[] MustHaveTrackIds { get; set; } = [];
}

public class PlaylistConfigData
{
    public Guid[] LibraryIds { get; set; } = [];
    
    public string[] SelectedGenres { get; set; } = [];
    
    public int DurationHours { get; set; }
    
    public int NumBlocks { get; set; }
    
    public int? YearStart { get; set; }
    
    public int? YearEnd { get; set; }
    
    public BlockConfig[] BlockConfigs { get; set; } = [];
    
    public Guid[] MustHaveTrackIds { get; set; } = [];
}

public class PlaylistTracksResponse
{
    public string Name { get; set; } = string.Empty;
    
    public List<TrackInfo> Tracks { get; set; } = [];
    
    public PlaylistConfigData? Config { get; set; }
}

public class JellyMixPlaylistInfo
{
    public Guid Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public int TrackCount { get; set; }
    
    public long DurationTicks { get; set; }
    
    public DateTime DateCreated { get; set; }
    
    public DateTime? UpdatedAt { get; set; }
    
    public PlaylistConfigData? Config { get; set; }
    
    public string DurationDisplay => TimeSpan.FromTicks(DurationTicks).ToString(@"h\:mm\:ss", CultureInfo.InvariantCulture);
}

public class LibraryInfo
{
    public Guid Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
}

public class GenreInfo
{
    public string Name { get; set; } = string.Empty;
    
    public int TrackCount { get; set; }
}

public class SearchTracksRequest
{
    public string Query { get; set; } = string.Empty;
    
    public Guid[] LibraryIds { get; set; } = [];
    
    public int Limit { get; set; } = 20;
}
