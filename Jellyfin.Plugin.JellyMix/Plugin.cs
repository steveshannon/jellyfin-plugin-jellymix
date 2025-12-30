using System;
using System.Collections.Generic;
using System.IO;
using Jellyfin.Plugin.JellyMix.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.JellyMix;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "JellyMix";

    public override string Description => "Create segmented playlists with genre weighting";

    public override Guid Id => Guid.Parse("a5b6c7d8-e9f0-1234-5678-9abcdef01234");

    public static Plugin? Instance { get; private set; }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = "jellymix",
                EmbeddedResourcePath = $"{GetType().Namespace}.Web.jellymix.html",
                DisplayName = "JellyMix",
                EnableInMainMenu = true,
                MenuSection = "server",
                MenuIcon = "queue_music"
            },
            new PluginPageInfo
            {
                Name = "jellymix.js",
                EmbeddedResourcePath = $"{GetType().Namespace}.Web.jellymix.js"
            },
            new PluginPageInfo
            {
                Name = "jellymix.css",
                EmbeddedResourcePath = $"{GetType().Namespace}.Web.jellymix.css"
            },
            new PluginPageInfo
            {
                Name = "jellymixed.png",
                EmbeddedResourcePath = $"{GetType().Namespace}.Web.jellymixed.png"
            }
        };
    }
}
