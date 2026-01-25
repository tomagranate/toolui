#!/bin/bash
#
# Install script for toolui
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/tomagranate/toolui/main/install.sh | bash
#
# Environment variables:
#   INSTALL_DIR  - Installation directory (default: /usr/local/bin or ~/.local/bin)
#   VERSION      - Specific version to install (default: latest)
#

set -e

# Configuration
REPO="tomagranate/toolui"
GITHUB_URL="https://github.com/${REPO}"
RELEASES_URL="${GITHUB_URL}/releases"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}==>${NC} $1"
}

success() {
    echo -e "${GREEN}==>${NC} $1"
}

warn() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

error() {
    echo -e "${RED}Error:${NC} $1" >&2
    exit 1
}

# Detect OS
detect_os() {
    local os
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "$os" in
        darwin) echo "darwin" ;;
        linux) echo "linux" ;;
        mingw*|msys*|cygwin*) echo "windows" ;;
        *) error "Unsupported operating system: $os" ;;
    esac
}

# Detect architecture
detect_arch() {
    local arch
    arch=$(uname -m)
    case "$arch" in
        x86_64|amd64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) error "Unsupported architecture: $arch" ;;
    esac
}

# Get latest version from GitHub
get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
    if [ -z "$version" ]; then
        error "Could not determine latest version. Check your internet connection or specify VERSION manually."
    fi
    echo "$version"
}

# Determine install directory
get_install_dir() {
    if [ -n "$INSTALL_DIR" ]; then
        echo "$INSTALL_DIR"
    elif [ -w "/usr/local/bin" ]; then
        echo "/usr/local/bin"
    else
        mkdir -p "$HOME/.local/bin"
        echo "$HOME/.local/bin"
    fi
}

# Check if directory is in PATH
check_path() {
    local dir="$1"
    case ":$PATH:" in
        *":$dir:"*) return 0 ;;
        *) return 1 ;;
    esac
}

# Main installation
main() {
    info "Installing toolui..."
    echo

    # Detect platform
    local os arch
    os=$(detect_os)
    arch=$(detect_arch)
    info "Detected platform: ${os}-${arch}"

    # Get version
    local version
    if [ -n "$VERSION" ]; then
        version="$VERSION"
    else
        info "Fetching latest version..."
        version=$(get_latest_version)
    fi
    info "Version: v${version}"

    # Determine install directory
    local install_dir
    install_dir=$(get_install_dir)
    info "Install directory: ${install_dir}"

    # Build download URL
    local binary_name="toolui-${os}-${arch}"
    local archive_ext="tar.gz"
    if [ "$os" = "windows" ]; then
        archive_ext="zip"
        binary_name="${binary_name}.exe"
    fi
    local download_url="${RELEASES_URL}/download/v${version}/${binary_name%.exe}.${archive_ext}"

    # Create temporary directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf '$tmp_dir'" EXIT

    # Download
    info "Downloading from ${download_url}..."
    if ! curl -fsSL "$download_url" -o "${tmp_dir}/archive.${archive_ext}"; then
        error "Download failed. Please check that version v${version} exists for ${os}-${arch}."
    fi

    # Extract
    info "Extracting..."
    cd "$tmp_dir"
    if [ "$archive_ext" = "tar.gz" ]; then
        tar -xzf "archive.tar.gz"
    else
        unzip -q "archive.zip"
    fi

    # Find the binary
    local binary_file
    binary_file=$(find . -name "toolui*" -type f ! -name "*.tar.gz" ! -name "*.zip" | head -1)
    if [ -z "$binary_file" ]; then
        error "Could not find binary in archive"
    fi

    # Install
    info "Installing to ${install_dir}/toolui..."
    chmod +x "$binary_file"
    
    # Use sudo if needed and available
    if [ -w "$install_dir" ]; then
        mv "$binary_file" "${install_dir}/toolui"
    elif command -v sudo &>/dev/null; then
        sudo mv "$binary_file" "${install_dir}/toolui"
    else
        error "Cannot write to ${install_dir}. Please run with sudo or set INSTALL_DIR to a writable directory."
    fi

    echo
    success "toolui v${version} installed successfully!"
    echo

    # Check if install directory is in PATH
    if ! check_path "$install_dir"; then
        warn "${install_dir} is not in your PATH"
        echo
        echo "Add this to your shell profile (.bashrc, .zshrc, etc.):"
        echo
        echo "    export PATH=\"\$PATH:${install_dir}\""
        echo
    fi

    # Verify installation
    if command -v toolui &>/dev/null; then
        echo "Run 'toolui --help' to get started."
    else
        echo "Run '${install_dir}/toolui --help' to get started."
    fi
}

main "$@"
