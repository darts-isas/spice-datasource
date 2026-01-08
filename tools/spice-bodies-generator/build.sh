#!/bin/bash
set -e

# SPICE Bodies Generator Build Script
#
# This script builds the spice-bodies-generator tool with flexible CSPICE location support.
#
# Usage:
#   ./build.sh                          # Auto-detect CSPICE location
#   CSPICE_ROOT=/path/to/cspice ./build.sh
#   CGO_CFLAGS="-I/custom/path" CGO_LDFLAGS="-L/custom/path -lcspice" ./build.sh

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Building spice-bodies-generator..."

# Auto-detect CSPICE location
detect_cspice() {
    local locations=(
        "/opt/homebrew/opt/cspice"     # Homebrew on Apple Silicon
        "/usr/local/opt/cspice"         # Homebrew on Intel Mac
        "/usr/local"                    # System install
        "$HOME/.local"                  # User install
        "./cspice"                      # Local directory
        "../cspice"                     # Parent directory
    )

    for loc in "${locations[@]}"; do
        if [ -f "$loc/lib/cspice.a" ] || [ -f "$loc/lib/libcspice.a" ]; then
            echo "$loc"
            return 0
        fi
    done

    return 1
}

# Main build logic
build() {
    local cspice_root=""
    local use_env_cgo=false

    # Check if CGO flags are already set
    if [ -n "$CGO_CFLAGS" ] && [ -n "$CGO_LDFLAGS" ]; then
        echo -e "${GREEN}✓ Using CGO flags from environment${NC}"
        echo "  CGO_CFLAGS=$CGO_CFLAGS"
        echo "  CGO_LDFLAGS=$CGO_LDFLAGS"
        use_env_cgo=true
    # Use CSPICE_ROOT if provided
    elif [ -n "$CSPICE_ROOT" ]; then
        echo -e "${YELLOW}→ Using CSPICE_ROOT: $CSPICE_ROOT${NC}"
        if [ ! -d "$CSPICE_ROOT" ]; then
            echo -e "${RED}✗ CSPICE directory not found: $CSPICE_ROOT${NC}"
            exit 1
        fi
        cspice_root="$CSPICE_ROOT"
        export CGO_CFLAGS="-I$cspice_root/include"
        export CGO_LDFLAGS="-L$cspice_root/lib -lcspice -lm"
        use_env_cgo=true
    # Try to auto-detect
    else
        echo -e "${YELLOW}→ Auto-detecting CSPICE location...${NC}"
        local detected=$(detect_cspice)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Found CSPICE at: $detected${NC}"
            cspice_root="$detected"
            export CGO_CFLAGS="-I$cspice_root/include"
            export CGO_LDFLAGS="-L$cspice_root/lib -lcspice -lm"
            use_env_cgo=true
        else
            echo -e "${YELLOW}→ No CSPICE auto-detected, using build-tag defaults${NC}"
            echo -e "${YELLOW}  (This will use platform-specific defaults from main.go)${NC}"
        fi
    fi

    # Build
    echo -e "${YELLOW}→ Building...${NC}"
    if [ "$use_env_cgo" = true ]; then
        echo "  CGO_CFLAGS=$CGO_CFLAGS"
        echo "  CGO_LDFLAGS=$CGO_LDFLAGS"
    fi
    go build -o spice-bodies-generator

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build successful: spice-bodies-generator${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        echo ""
        echo "If build failed due to missing CSPICE, try:"
        echo "  ./install-cspice.sh"
        echo ""
        echo "Or specify CSPICE location:"
        echo "  CSPICE_ROOT=/path/to/cspice ./build.sh"
        exit 1
    fi
}

build
