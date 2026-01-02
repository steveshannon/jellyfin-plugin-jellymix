using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Data.Enums;
using Jellyfin.Plugin.JellyMix.Api;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Audio;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Playlists;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Playlists;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.JellyMix.Api;

[ApiController]
[Authorize]
[Route("JellyMix")]
[Produces("application/json")]
public class JellyMixController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly IPlaylistManager _playlistManager;
    private readonly IUserManager _userManager;
    private readonly IServerApplicationPaths _appPaths;
    private readonly IProviderManager _providerManager;
    private readonly ILogger<JellyMixController> _logger;

    public JellyMixController(
        ILibraryManager libraryManager,
        IPlaylistManager playlistManager,
        IUserManager userManager,
        IServerApplicationPaths appPaths,
        IProviderManager providerManager,
        ILogger<JellyMixController> logger)
    {
        _libraryManager = libraryManager;
        _playlistManager = playlistManager;
        _userManager = userManager;
        _appPaths = appPaths;
        _providerManager = providerManager;
        _logger = logger;
    }

    [HttpGet("Libraries")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<LibraryInfo>> GetLibraries()
    {
        var libraries = _libraryManager.GetVirtualFolders()
            .Where(f => f.CollectionType == CollectionTypeOptions.music)
            .Select(f => new LibraryInfo
            {
                Id = Guid.Parse(f.ItemId),
                Name = f.Name
            })
            .ToList();

        return Ok(libraries);
    }

    [HttpGet("Genres")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<GenreInfo>> GetGenres([FromQuery] Guid[] libraryIds)
    {
        var allItems = new List<BaseItem>();

        foreach (var libraryId in libraryIds)
        {
            var query = new InternalItemsQuery
            {
                IncludeItemTypes = [BaseItemKind.Audio],
                ParentId = libraryId,
                Recursive = true
            };
            allItems.AddRange(_libraryManager.GetItemList(query));
        }

        var genreCounts = allItems
            .SelectMany(item => item.Genres)
            .Where(g => !string.IsNullOrWhiteSpace(g))
            .GroupBy(g => g, StringComparer.OrdinalIgnoreCase)
            .Select(g => new GenreInfo
            {
                Name = g.Key,
                TrackCount = g.Count()
            })
            .OrderBy(g => g.Name)
            .ToList();

        return Ok(genreCounts);
    }

    [HttpPost("Generate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<PlaylistPreview> GeneratePlaylist([FromBody] GeneratePlaylistRequest request)
    {
        var allItems = new List<BaseItem>();

        foreach (var libraryId in request.LibraryIds)
        {
            var query = new InternalItemsQuery
            {
                IncludeItemTypes = [BaseItemKind.Audio],
                ParentId = libraryId,
                Recursive = true
            };

            if (request.Genres.Length > 0)
            {
                query.Genres = request.Genres;
            }

            if (request.YearStart.HasValue)
            {
                query.MinPremiereDate = new DateTime(request.YearStart.Value, 1, 1);
            }

            if (request.YearEnd.HasValue)
            {
                query.MaxPremiereDate = new DateTime(request.YearEnd.Value, 12, 31);
            }

            allItems.AddRange(_libraryManager.GetItemList(query));
        }

        var tracksByGenre = new Dictionary<string, List<BaseItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in allItems)
        {
            foreach (var genre in item.Genres)
            {
                if (string.IsNullOrWhiteSpace(genre)) continue;
                if (!tracksByGenre.ContainsKey(genre))
                    tracksByGenre[genre] = new List<BaseItem>();
                tracksByGenre[genre].Add(item);
            }
        }

        var totalDurationTicks = TimeSpan.FromMinutes(request.DurationMinutes).Ticks;
        var ticksPerBlock = totalDurationTicks / request.Blocks.Length;

        var preview = new PlaylistPreview
        {
            Name = request.Name,
            Blocks = []
        };

        var globalUsedTrackIds = new HashSet<Guid>();

        foreach (var blockConfig in request.Blocks)
        {
            var block = GenerateBlock(blockConfig, tracksByGenre, ticksPerBlock, globalUsedTrackIds);
            preview.Blocks.Add(block);
        }

        preview.TotalDurationTicks = preview.Blocks.Sum(b => b.TotalDurationTicks);

        return Ok(preview);
    }

    private static BlockResult GenerateBlock(BlockConfig config, Dictionary<string, List<BaseItem>> tracksByGenre, long targetTicks, HashSet<Guid>? globalUsedTrackIds = null)
    {
        var block = new BlockResult
        {
            Name = config.Name,
            GenreWeights = config.GenreWeights,
            Tracks = []
        };

        var totalWeight = config.GenreWeights.Values.Sum();
        if (totalWeight == 0)
        {
            return block;
        }

        var random = new Random();
        long currentTicks = 0;
        var localUsedTrackIds = new HashSet<Guid>();
        var localUsedArtists = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var exhaustedGenres = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        while (currentTicks < targetTicks)
        {
            var availableWeights = config.GenreWeights
                .Where(kvp => !exhaustedGenres.Contains(kvp.Key) && kvp.Value > 0)
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
            
            if (availableWeights.Count == 0)
            {
                exhaustedGenres.Clear();
                localUsedArtists.Clear();
                availableWeights = config.GenreWeights
                    .Where(kvp => kvp.Value > 0)
                    .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
                
                if (availableWeights.Count == 0)
                {
                    break;
                }
            }
            
            var availableWeight = availableWeights.Values.Sum();
            var selectedGenre = SelectWeightedGenre(availableWeights, random, availableWeight);
            
            if (!tracksByGenre.TryGetValue(selectedGenre, out var genreTracks) || genreTracks.Count == 0)
            {
                exhaustedGenres.Add(selectedGenre);
                continue;
            }

            var availableTracks = genreTracks
                .Where(t => !localUsedTrackIds.Contains(t.Id) && (globalUsedTrackIds == null || !globalUsedTrackIds.Contains(t.Id)))
                .Where(t => {
                    var audio = t as Audio;
                    var artist = NormalizeArtist(audio?.Artists?.FirstOrDefault() ?? "Unknown Artist");
                    return !localUsedArtists.Contains(artist);
                })
                .ToList();
            
            if (availableTracks.Count == 0)
            {
                availableTracks = genreTracks
                    .Where(t => !localUsedTrackIds.Contains(t.Id))
                    .Where(t => {
                        var audio = t as Audio;
                        var artist = NormalizeArtist(audio?.Artists?.FirstOrDefault() ?? "Unknown Artist");
                        return !localUsedArtists.Contains(artist);
                    })
                    .ToList();
            }
            
            if (availableTracks.Count == 0)
            {
                exhaustedGenres.Add(selectedGenre);
                continue;
            }

            var track = availableTracks[random.Next(availableTracks.Count)];
            localUsedTrackIds.Add(track.Id);
            globalUsedTrackIds?.Add(track.Id);

            var audio = track as Audio;
            var trackArtist = audio?.Artists?.FirstOrDefault() ?? "Unknown Artist";
            localUsedArtists.Add(NormalizeArtist(trackArtist));
            
            block.Tracks.Add(new TrackInfo
            {
                Id = track.Id,
                Name = track.Name,
                Artist = trackArtist,
                Album = audio?.Album ?? "Unknown Album",
                Genre = selectedGenre,
                Year = track.PremiereDate?.Year,
                DurationTicks = track.RunTimeTicks ?? 0,
                IsMustHave = false
            });

            currentTicks += track.RunTimeTicks ?? 0;
        }

        block.TotalDurationTicks = currentTicks;
        return block;
    }

    private static string SelectWeightedGenre(Dictionary<string, int> weights, Random random, int totalWeight)
    {
        var roll = random.Next(totalWeight);
        var cumulative = 0;

        foreach (var kvp in weights)
        {
            cumulative += kvp.Value;
            if (roll < cumulative)
            {
                return kvp.Key;
            }
        }

        return weights.Keys.First();
    }

    private static string NormalizeArtist(string artist)
    {
        if (string.IsNullOrWhiteSpace(artist)) return "Unknown Artist";
        
        string[] separators = [" and ", " & ", " feat. ", " feat ", " featuring ", " with ", " vs ", " vs. ", ", "];
        var normalized = artist.Trim();
        
        foreach (var sep in separators)
        {
            var idx = normalized.IndexOf(sep, StringComparison.OrdinalIgnoreCase);
            if (idx > 0)
            {
                normalized = normalized.Substring(0, idx).Trim();
            }
        }
        
        if (normalized.StartsWith("The ", StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized.Substring(4);
        }
        
        return normalized;
    }

    [HttpPost("RemixBlock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<BlockResult> RemixBlock([FromBody] RemixBlockRequest request)
    {
        var allItems = new List<BaseItem>();

        foreach (var libraryId in request.LibraryIds)
        {
            var query = new InternalItemsQuery
            {
                IncludeItemTypes = [BaseItemKind.Audio],
                ParentId = libraryId,
                Recursive = true
            };

            if (request.Genres != null && request.Genres.Length > 0)
            {
                query.Genres = request.Genres;
            }

            if (request.YearStart.HasValue)
            {
                query.MinPremiereDate = new DateTime(request.YearStart.Value, 1, 1);
            }

            if (request.YearEnd.HasValue)
            {
                query.MaxPremiereDate = new DateTime(request.YearEnd.Value, 12, 31);
            }

            allItems.AddRange(_libraryManager.GetItemList(query));
        }

        var tracksByGenre = new Dictionary<string, List<BaseItem>>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in allItems)
        {
            foreach (var genre in item.Genres)
            {
                if (string.IsNullOrWhiteSpace(genre)) continue;
                if (!tracksByGenre.ContainsKey(genre))
                    tracksByGenre[genre] = new List<BaseItem>();
                tracksByGenre[genre].Add(item);
            }
        }

        var targetTicks = TimeSpan.FromMinutes(request.DurationMinutes).Ticks;
        var block = GenerateBlock(request.BlockConfig, tracksByGenre, targetTicks);

        return Ok(block);
    }

    [HttpGet("Search")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<TrackInfo>> SearchTracks(
        [FromQuery] string? query,
        [FromQuery] string? artist,
        [FromQuery] Guid[] libraryIds,
        [FromQuery] int limit = 20)
    {
        var allItems = new List<BaseItem>();

        foreach (var libraryId in libraryIds)
        {
            var itemQuery = new InternalItemsQuery
            {
                IncludeItemTypes = [BaseItemKind.Audio],
                ParentId = libraryId,
                Recursive = true,
                Limit = string.IsNullOrEmpty(artist) ? limit : limit * 10
            };
            
            if (!string.IsNullOrEmpty(query))
            {
                itemQuery.SearchTerm = query;
            }
            
            allItems.AddRange(_libraryManager.GetItemList(itemQuery));
        }

        IEnumerable<BaseItem> filtered = allItems;
        
        if (!string.IsNullOrEmpty(artist))
        {
            var artistLower = artist.ToLowerInvariant();
            filtered = filtered.Where(item =>
            {
                var audio = item as Audio;
                var itemArtist = audio?.Artists?.FirstOrDefault() ?? "";
                return itemArtist.Contains(artistLower, StringComparison.OrdinalIgnoreCase);
            });
        }

        var tracks = filtered
            .Take(limit)
            .Select(item =>
            {
                var audio = item as Audio;
                return new TrackInfo
                {
                    Id = item.Id,
                    Name = item.Name,
                    Artist = audio?.Artists?.FirstOrDefault() ?? "Unknown Artist",
                    Album = audio?.Album ?? "Unknown Album",
                    Genre = item.Genres.FirstOrDefault() ?? "Unknown",
                    Year = item.PremiereDate?.Year,
                    DurationTicks = item.RunTimeTicks ?? 0,
                    IsMustHave = false
                };
            })
            .ToList();

        return Ok(tracks);
    }

    [HttpPost("Save")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<JellyMixPlaylistInfo>> SavePlaylist([FromBody] SavePlaylistRequest request)
    {
        Playlist? existing = null;
        
        if (request.ExistingPlaylistId.HasValue)
        {
            existing = _libraryManager.GetItemById(request.ExistingPlaylistId.Value) as Playlist;
            _logger.LogInformation("JellyMix: Found existing playlist by ID: {Id}, Name: {Name}", request.ExistingPlaylistId.Value, existing?.Name ?? "null");
        }
        
        if (existing == null && !string.IsNullOrEmpty(request.Name))
        {
            var existingQuery = new InternalItemsQuery
            {
                IncludeItemTypes = [BaseItemKind.Playlist],
                Name = request.Name,
                Recursive = true
            };
            var existingPlaylists = _libraryManager.GetItemList(existingQuery);
            existing = existingPlaylists.FirstOrDefault() as Playlist;
            if (existing != null)
            {
                _logger.LogInformation("JellyMix: Found existing playlist by name: {Name}", request.Name);
            }
        }

        Playlist playlist;

        if (existing != null)
        {
            _logger.LogInformation("JellyMix: Updating existing playlist {Name} ({Id})", existing.Name, existing.Id);
            
            var linkedChildren = existing.LinkedChildren;
            _logger.LogInformation("JellyMix: Playlist has {Count} linked children", linkedChildren.Length);
            
            if (linkedChildren.Length > 0)
            {
                existing.LinkedChildren = [];
                await existing.UpdateToRepositoryAsync(ItemUpdateType.MetadataEdit, CancellationToken.None).ConfigureAwait(false);
                _logger.LogInformation("JellyMix: Cleared linked children");
            }

            await _playlistManager.AddItemToPlaylistAsync(
                existing.Id,
                request.TrackIds,
                request.UserId)
                .ConfigureAwait(false);
            
            _logger.LogInformation("JellyMix: Added {Count} new tracks", request.TrackIds.Length);

            playlist = existing;
        }
        else
        {
            _logger.LogInformation("JellyMix: Creating new playlist: {Name}", request.Name);
            var result = await _playlistManager.CreatePlaylist(new PlaylistCreationRequest
            {
                Name = request.Name,
                ItemIdList = request.TrackIds,
                UserId = request.UserId,
                MediaType = MediaType.Audio
            }).ConfigureAwait(false);

            playlist = _libraryManager.GetItemById(result.Id) as Playlist
                ?? throw new InvalidOperationException("Failed to create playlist");
                
            await SetPlaylistImageAsync(playlist).ConfigureAwait(false);
        }

        var config = Plugin.Instance?.Configuration;
        if (config != null && request.Config != null)
        {
            config.SavedPlaylists ??= new List<Configuration.SavedPlaylistConfig>();
            
            var blockConfigs = request.Config.BlockConfigs ?? [];
            var savedConfig = new Configuration.SavedPlaylistConfig
            {
                PlaylistId = playlist.Id,
                Name = request.Name,
                LibraryIds = (request.Config.LibraryIds ?? []).ToList(),
                SelectedGenres = (request.Config.SelectedGenres ?? []).ToList(),
                DurationHours = request.Config.DurationHours,
                NumBlocks = request.Config.NumBlocks,
                YearStart = request.Config.YearStart,
                YearEnd = request.Config.YearEnd,
                BlockConfigs = blockConfigs.Select(b => new Configuration.SavedBlockConfig
                {
                    Name = b.Name ?? string.Empty,
                    GenreWeights = (b.GenreWeights ?? new Dictionary<string, int>())
                        .Select(kv => new Configuration.GenreWeight { Genre = kv.Key, Weight = kv.Value })
                        .ToList(),
                    TrackIds = (b.TrackIds ?? []).ToList()
                }).ToList(),
                MustHaveTrackIds = (request.MustHaveTrackIds ?? []).ToList(),
                UpdatedAt = DateTime.UtcNow
            };

            Configuration.SavedPlaylistConfig? existingConfig = null;
            
            if (request.ExistingPlaylistId.HasValue)
            {
                existingConfig = config.SavedPlaylists.FirstOrDefault(p => p.PlaylistId == request.ExistingPlaylistId.Value);
            }
            
            if (existingConfig == null)
            {
                existingConfig = config.SavedPlaylists.FirstOrDefault(p => p.PlaylistId == playlist.Id);
            }
            
            if (existingConfig != null)
            {
                savedConfig.CreatedAt = existingConfig.CreatedAt;
                config.SavedPlaylists.Remove(existingConfig);
            }
            else
            {
                savedConfig.CreatedAt = DateTime.UtcNow;
            }

            config.SavedPlaylists.Add(savedConfig);
            Plugin.Instance?.SaveConfiguration();
        }

        return Ok(new JellyMixPlaylistInfo
        {
            Id = playlist.Id,
            Name = playlist.Name,
            TrackCount = request.TrackIds.Length,
            DurationTicks = playlist.RunTimeTicks ?? 0,
            DateCreated = playlist.DateCreated
        });
    }

    [HttpGet("Playlists")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<JellyMixPlaylistInfo>> GetPlaylists([FromQuery] Guid userId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config?.SavedPlaylists == null || config.SavedPlaylists.Count == 0)
        {
            return Ok(new List<JellyMixPlaylistInfo>());
        }

        var result = new List<JellyMixPlaylistInfo>();
        var toRemove = new List<Configuration.SavedPlaylistConfig>();

        foreach (var savedConfig in config.SavedPlaylists)
        {
            if (savedConfig == null) continue;
            
            var playlist = _libraryManager.GetItemById(savedConfig.PlaylistId) as Playlist;
            
            if (playlist == null)
            {
                toRemove.Add(savedConfig);
                continue;
            }

            var blockConfigs = savedConfig.BlockConfigs ?? new List<Configuration.SavedBlockConfig>();
            result.Add(new JellyMixPlaylistInfo
            {
                Id = playlist.Id,
                Name = playlist.Name,
                TrackCount = playlist.GetManageableItems().Count,
                DurationTicks = playlist.RunTimeTicks ?? 0,
                DateCreated = playlist.DateCreated,
                UpdatedAt = savedConfig.UpdatedAt,
                Config = new PlaylistConfigData
                {
                    LibraryIds = savedConfig.LibraryIds?.ToArray() ?? [],
                    SelectedGenres = savedConfig.SelectedGenres?.ToArray() ?? [],
                    DurationHours = savedConfig.DurationHours,
                    NumBlocks = savedConfig.NumBlocks,
                    YearStart = savedConfig.YearStart,
                    YearEnd = savedConfig.YearEnd,
                    BlockConfigs = blockConfigs.Select(b => new BlockConfig
                    {
                        Name = b?.Name ?? string.Empty,
                        GenreWeights = (b?.GenreWeights ?? new List<Configuration.GenreWeight>())
                            .ToDictionary(gw => gw.Genre, gw => gw.Weight)
                    }).ToArray()
                }
            });
        }

        if (toRemove.Count > 0)
        {
            foreach (var item in toRemove)
            {
                config.SavedPlaylists.Remove(item);
            }
            Plugin.Instance?.SaveConfiguration();
        }

        return Ok(result.OrderByDescending(p => p.UpdatedAt ?? p.DateCreated));
    }

    [HttpGet("Playlists/{playlistId}/Tracks")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<PlaylistTracksResponse> GetPlaylistTracks(Guid playlistId)
    {
        var playlist = _libraryManager.GetItemById(playlistId) as Playlist;
        if (playlist == null)
        {
            return NotFound();
        }

        var config = Plugin.Instance?.Configuration;
        var savedConfig = config?.SavedPlaylists?.FirstOrDefault(p => p.PlaylistId == playlistId);
        var mustHaveIds = savedConfig?.MustHaveTrackIds ?? new List<Guid>();
        var blockConfigs = savedConfig?.BlockConfigs ?? new List<Configuration.SavedBlockConfig>();

        var linkedChildren = playlist.LinkedChildren;
        var trackLookup = new Dictionary<Guid, TrackInfo>();

        foreach (var child in linkedChildren)
        {
            if (!child.ItemId.HasValue) continue;
            var item = _libraryManager.GetItemById(child.ItemId.Value);
            if (item == null) continue;

            var audio = item as Audio;
            trackLookup[item.Id] = new TrackInfo
            {
                Id = item.Id,
                Name = item.Name,
                Artist = audio?.Artists?.FirstOrDefault() ?? "Unknown Artist",
                Album = audio?.Album ?? "Unknown Album",
                Genre = item.Genres.FirstOrDefault() ?? "Unknown",
                Year = item.PremiereDate?.Year,
                DurationTicks = item.RunTimeTicks ?? 0,
                IsMustHave = mustHaveIds.Contains(item.Id)
            };
        }

        var responseBlocks = new List<BlockConfig>();
        var usedTrackIds = new HashSet<Guid>();

        foreach (var blockConfig in blockConfigs)
        {
            var blockTrackIds = blockConfig.TrackIds ?? new List<Guid>();
            var validTrackIds = blockTrackIds.Where(id => trackLookup.ContainsKey(id)).ToList();
            validTrackIds.ForEach(id => usedTrackIds.Add(id));
            
            responseBlocks.Add(new BlockConfig
            {
                Name = blockConfig.Name ?? string.Empty,
                GenreWeights = (blockConfig.GenreWeights ?? new List<Configuration.GenreWeight>())
                    .ToDictionary(gw => gw.Genre, gw => gw.Weight),
                TrackIds = validTrackIds.ToArray()
            });
        }

        var unusedTracks = trackLookup.Keys.Where(id => !usedTrackIds.Contains(id)).ToList();
        if (unusedTracks.Count > 0 && responseBlocks.Count > 0)
        {
            responseBlocks[responseBlocks.Count - 1].TrackIds = 
                responseBlocks[responseBlocks.Count - 1].TrackIds.Concat(unusedTracks).ToArray();
        }
        else if (unusedTracks.Count > 0)
        {
            responseBlocks.Add(new BlockConfig
            {
                Name = "Block 1",
                GenreWeights = new Dictionary<string, int>(),
                TrackIds = unusedTracks.ToArray()
            });
        }

        return Ok(new PlaylistTracksResponse
        {
            Name = playlist.Name,
            Tracks = trackLookup.Values.ToList(),
            Config = savedConfig != null ? new PlaylistConfigData
            {
                LibraryIds = savedConfig.LibraryIds?.ToArray() ?? [],
                SelectedGenres = savedConfig.SelectedGenres?.ToArray() ?? [],
                DurationHours = savedConfig.DurationHours,
                NumBlocks = savedConfig.NumBlocks,
                YearStart = savedConfig.YearStart,
                YearEnd = savedConfig.YearEnd,
                BlockConfigs = responseBlocks.ToArray(),
                MustHaveTrackIds = mustHaveIds.ToArray()
            } : null
        });
    }

    [HttpDelete("Playlists/{playlistId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult DeletePlaylist(Guid playlistId)
    {
        var playlist = _libraryManager.GetItemById(playlistId);
        if (playlist == null)
        {
            return NotFound();
        }

        _libraryManager.DeleteItem(playlist, new DeleteOptions { DeleteFileLocation = true });

        var config = Plugin.Instance?.Configuration;
        if (config?.SavedPlaylists != null)
        {
            var toRemove = config.SavedPlaylists.FirstOrDefault(p => p.PlaylistId == playlistId);
            if (toRemove != null)
            {
                config.SavedPlaylists.Remove(toRemove);
                Plugin.Instance?.SaveConfiguration();
            }
        }

        return Ok();
    }

    private async Task SetPlaylistImageAsync(Playlist playlist)
    {
        try
        {
            var pluginPath = Path.GetDirectoryName(typeof(Plugin).Assembly.Location);
            if (string.IsNullOrEmpty(pluginPath)) return;
            
            var imagePath = Path.Combine(pluginPath, "jellymixed.png");
            if (!System.IO.File.Exists(imagePath)) return;
            
            await using var stream = System.IO.File.OpenRead(imagePath);
            using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream).ConfigureAwait(false);
            memoryStream.Position = 0;
            
            await _providerManager.SaveImage(playlist, memoryStream, "image/png", ImageType.Primary, null, CancellationToken.None).ConfigureAwait(false);
            await playlist.UpdateToRepositoryAsync(ItemUpdateType.ImageUpdate, CancellationToken.None).ConfigureAwait(false);
        }
        catch
        {
        }
    }
}
