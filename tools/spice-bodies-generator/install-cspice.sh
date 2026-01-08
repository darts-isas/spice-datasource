#!/bin/bash

# Script to download and install CSPICE toolkit

set -e

PLATFORM=""
CSPICE_URL=""

# Detect platform
case "$(uname -s)" in
    Darwin)
        PLATFORM="MacIntel_OSX_AppleC_64bit"
        ;;
    Linux)
        PLATFORM="PC_Linux_GCC_64bit"
        ;;
    *)
        echo "Unsupported platform: $(uname -s)"
        exit 1
        ;;
esac

echo "Detected platform: $PLATFORM"

CSPICE_URL="https://naif.jpl.nasa.gov/pub/naif/toolkit/C/${PLATFORM}/packages/cspice.tar.Z"

echo "Downloading CSPICE from $CSPICE_URL..."
curl -L -O "$CSPICE_URL"

echo "Extracting CSPICE..."
if command -v uncompress &> /dev/null; then
    uncompress cspice.tar.Z
else
    # Use gzip as alternative
    gunzip cspice.tar.Z 2>/dev/null || mv cspice.tar.Z cspice.tar.gz && gunzip cspice.tar.gz
fi

tar xf cspice.tar
rm cspice.tar

echo "Installing CSPICE to /usr/local..."
sudo mkdir -p /usr/local/lib /usr/local/include

sudo cp cspice/lib/cspice.a /usr/local/lib/
sudo cp -r cspice/include /usr/local/include/cspice

echo "CSPICE installed successfully!"
echo ""
echo "Installed files:"
echo "  Library: /usr/local/lib/cspice.a"
echo "  Headers: /usr/local/include/cspice/"
echo ""
echo "You can now build the spice-bodies-generator:"
echo "  cd tools/spice-bodies-generator"
echo "  go build"
