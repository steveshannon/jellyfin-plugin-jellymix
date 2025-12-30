# Contributing to JellyMix

Thanks for your interest in contributing!

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/sshannon/jellymix/issues) first
2. Include Jellyfin version, JellyMix version, and OS
3. Steps to reproduce
4. Expected vs actual behavior

### Feature Requests

Open an issue with the "enhancement" label. Describe the use case.

### Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make changes
4. Test with your Jellyfin instance
5. Submit PR against `main`

### Development Setup

```bash
git clone https://github.com/sshannon/jellymix.git
cd jellymix
dotnet restore
dotnet build
```

Copy output from `Jellyfin.Plugin.JellyMix/bin/Debug/net8.0/` to your plugins folder.

### Code Style

- Follow existing patterns
- No inline comments in code blocks
- Use descriptive variable names

## License

By contributing, you agree that your contributions will be licensed under GPL-2.0.
