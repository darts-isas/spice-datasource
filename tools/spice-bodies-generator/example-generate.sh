#!/bin/bash

# Example script to generate spice-bodies.json from kernel files
# This script demonstrates how to use spice-bodies-generator with the kernels in the data directory

set -e

# Path to kernel files
KERNEL_DIR="../../data/kernels"
LSK_FILE="$KERNEL_DIR/lsk/naif0012.tls"
OUTPUT_FILE="../../data/spice-bodies.json"

echo "Generating spice-bodies.json from kernel files..."
echo ""

# Check if spice-bodies-generator exists
if [ ! -f "./spice-bodies-generator" ]; then
    echo "Error: spice-bodies-generator not found. Building it now..."
    ./build.sh
    echo ""
fi

# Collect all SPK files
SPK_FILES=("$KERNEL_DIR/spk"/*.bsp)

if [ ${#SPK_FILES[@]} -eq 0 ]; then
    echo "Error: No SPK files found in $KERNEL_DIR/spk/"
    exit 1
fi

# Build the command
CMD="./spice-bodies-generator -v -o $OUTPUT_FILE"

if [ -f "$LSK_FILE" ]; then
    CMD="$CMD -lsk $LSK_FILE"
    echo "Using LSK: $LSK_FILE"
else
    echo "Warning: LSK file not found: $LSK_FILE"
fi

# Add all SPK files
echo "Using SPK files:"
for spk in "${SPK_FILES[@]}"; do
    if [ -f "$spk" ]; then
        CMD="$CMD $spk"
        echo "  - $(basename $spk)"
    fi
done

echo ""
echo "Output: $OUTPUT_FILE"
echo ""

# Execute
eval $CMD

echo ""
echo "✓ Successfully generated $OUTPUT_FILE"
