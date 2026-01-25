# Homebrew Tap Setup

This directory contains the template and instructions for setting up a Homebrew tap for toolui.

## Setup Instructions

1. **Create a new repository** named `homebrew-toolui` in your GitHub account

2. **Copy the formula** from `Formula/toolui.rb` in this directory to `Formula/toolui.rb` in the new repository

3. **Update the formula** with:
   - Replace `tomagranate` with your actual GitHub username
   - Update SHA256 checksums after the first release (they'll be generated automatically)

4. **Add the workflow** from `.github/workflows/update-formula.yml` to the tap repository

5. **Configure secrets** in the main toolui repository:
   - Create a Personal Access Token with `repo` scope
   - Add it as `HOMEBREW_TAP_TOKEN` secret in the toolui repository

## How It Works

When you push a new version tag (e.g., `v0.1.0`) to the main toolui repository:

1. The release workflow builds binaries for all platforms
2. Creates a GitHub release with the binaries and checksums
3. Triggers the `update-formula` event in the homebrew-toolui repository
4. The tap repository workflow automatically updates the formula with new version and checksums

## Manual Formula Update

If the automatic update fails, you can manually update the formula:

1. Download the release assets and their `.sha256` files
2. Update the `version` in the formula
3. Update the SHA256 checksums for each platform
4. Commit and push to the tap repository

## Installation

Users can install toolui via Homebrew with:

```bash
# Add the tap
brew tap tomagranate/toolui

# Install toolui
brew install toolui

# Or in one command
brew install tomagranate/toolui/toolui
```
