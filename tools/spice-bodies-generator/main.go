package main

/*
// Default CSPICE paths (can be overridden by CGO_CFLAGS/CGO_LDFLAGS environment variables)
// Example for macOS Homebrew:
#cgo darwin,amd64 CFLAGS: -I/usr/local/opt/cspice/include
#cgo darwin,amd64 LDFLAGS: -L/usr/local/opt/cspice/lib -lcspice -lm
#cgo darwin,arm64 CFLAGS: -I/opt/homebrew/opt/cspice/include
#cgo darwin,arm64 LDFLAGS: -L/opt/homebrew/opt/cspice/lib -lcspice -lm
// Example for Linux:
#cgo linux CFLAGS: -I/usr/local/include/cspice
#cgo linux LDFLAGS: -L/usr/local/lib -lcspice -lm

#include "SpiceUsr.h"
#include <stdlib.h>
*/
import "C"

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"unsafe"
)

// SpiceBody represents a SPICE body with ID and name
type SpiceBody struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// SpiceBodiesJSON represents the output JSON structure
type SpiceBodiesJSON struct {
	Bodies []SpiceBody `json:"bodies"`
}

var (
	outputFile = flag.String("o", "spice-bodies.json", "Output file path")
	lskFile    = flag.String("lsk", "", "Leapseconds kernel (LSK) file path")
	pretty     = flag.Bool("pretty", true, "Pretty print JSON output")
	verbose    = flag.Bool("v", false, "Verbose output")
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options] <spk-files...>\n\n", filepath.Base(os.Args[0]))
		fmt.Fprintf(os.Stderr, "Extract body IDs from SPK kernel files and generate spice-bodies.json\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExample:\n")
		fmt.Fprintf(os.Stderr, "  %s -o spice-bodies.json de432s.bsp jup365.bsp\n", filepath.Base(os.Args[0]))
	}

	flag.Parse()

	spkFiles := flag.Args()
	if len(spkFiles) == 0 {
		fmt.Fprintf(os.Stderr, "Error: No SPK files specified\n\n")
		flag.Usage()
		os.Exit(1)
	}

	// Verify SPK files exist
	for _, spkFile := range spkFiles {
		if _, err := os.Stat(spkFile); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Error: SPK file not found: %s\n", spkFile)
			os.Exit(1)
		}
	}

	// Load LSK if specified
	if *lskFile != "" {
		if _, err := os.Stat(*lskFile); os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Error: LSK file not found: %s\n", *lskFile)
			os.Exit(1)
		}
		if err := loadKernel(*lskFile); err != nil {
			fmt.Fprintf(os.Stderr, "Error loading LSK kernel: %v\n", err)
			os.Exit(1)
		}
		if *verbose {
			fmt.Printf("Loaded LSK kernel: %s\n", *lskFile)
		}
	}

	// Extract body IDs from all SPK files
	bodyIDSet := make(map[int]bool)

	for _, spkFile := range spkFiles {
		if *verbose {
			fmt.Printf("Processing SPK file: %s\n", spkFile)
		}

		// Load SPK kernel
		if err := loadKernel(spkFile); err != nil {
			fmt.Fprintf(os.Stderr, "Error loading SPK kernel %s: %v\n", spkFile, err)
			os.Exit(1)
		}

		// Get body IDs from this SPK file
		bodyIDs, err := getBodyIDsFromSPK(spkFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error extracting body IDs from %s: %v\n", spkFile, err)
			os.Exit(1)
		}

		if *verbose {
			fmt.Printf("  Found %d body IDs\n", len(bodyIDs))
		}

		// Add to set
		for _, id := range bodyIDs {
			bodyIDSet[id] = true
		}

		// Unload kernel to free memory
		if err := unloadKernel(spkFile); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Failed to unload kernel %s: %v\n", spkFile, err)
		}
	}

	// Convert set to sorted slice
	bodyIDs := make([]int, 0, len(bodyIDSet))
	for id := range bodyIDSet {
		bodyIDs = append(bodyIDs, id)
	}
	sort.Ints(bodyIDs)

	if *verbose {
		fmt.Printf("Total unique body IDs: %d\n", len(bodyIDs))
	}

	// Get body names
	bodies := make([]SpiceBody, 0, len(bodyIDs))
	for _, id := range bodyIDs {
		name, err := getBodyName(id)
		if err != nil {
			if *verbose {
				fmt.Printf("  Warning: Could not get name for body ID %d: %v\n", id, err)
			}
			// Use ID as name if name lookup fails
			name = fmt.Sprintf("%d", id)
		}

		bodies = append(bodies, SpiceBody{
			ID:   id,
			Name: name,
		})

		if *verbose {
			fmt.Printf("  %d: %s\n", id, name)
		}
	}

	// Generate JSON
	output := SpiceBodiesJSON{
		Bodies: bodies,
	}

	var jsonData []byte
	var err error
	if *pretty {
		jsonData, err = json.MarshalIndent(output, "", "  ")
	} else {
		jsonData, err = json.Marshal(output)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating JSON: %v\n", err)
		os.Exit(1)
	}

	// Write to file
	if err := os.WriteFile(*outputFile, jsonData, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing output file: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Successfully generated %s with %d bodies\n", *outputFile, len(bodies))
}

// loadKernel loads a SPICE kernel file
func loadKernel(filename string) error {
	cFilename := C.CString(filename)
	defer C.free(unsafe.Pointer(cFilename))

	C.furnsh_c(cFilename)

	return checkSpiceError()
}

// unloadKernel unloads a SPICE kernel file
func unloadKernel(filename string) error {
	cFilename := C.CString(filename)
	defer C.free(unsafe.Pointer(cFilename))

	C.unload_c(cFilename)

	return checkSpiceError()
}

// getBodyIDsFromSPK extracts body IDs from an SPK file using spkobj_c
func getBodyIDsFromSPK(filename string) ([]int, error) {
	cFilename := C.CString(filename)
	defer C.free(unsafe.Pointer(cFilename))

	// Create SPICE CELL for integer IDs
	// We need to allocate space for control area (SPICE_CELL_CTRLSZ=6) + data
	const cellSize = 10000
	const ctrlSize = 6
	// Use C memory allocation to avoid Go pointer issues
	cellData := (*[10000 + ctrlSize]C.SpiceInt)(C.malloc(C.size_t(cellSize+ctrlSize) * C.size_t(unsafe.Sizeof(C.SpiceInt(0)))))
	defer C.free(unsafe.Pointer(cellData))

	// Initialize the cell using scard_c and other setup
	// The cell structure needs proper initialization
	var cell C.SpiceCell
	cell.dtype = C.SPICE_INT
	cell.length = 0
	cell.size = cellSize
	cell.card = 0
	cell.isSet = C.SPICETRUE
	cell.adjust = C.SPICEFALSE
	cell.init = C.SPICEFALSE
	cell.base = unsafe.Pointer(&cellData[0])
	cell.data = unsafe.Pointer(&cellData[ctrlSize])

	// Call spkobj_c to get body IDs
	C.spkobj_c(cFilename, &cell)

	if err := checkSpiceError(); err != nil {
		return nil, err
	}

	// Get cardinality (number of elements)
	card := int(C.card_c(&cell))

	// Extract IDs from cell data
	bodyIDs := make([]int, card)
	for i := 0; i < card; i++ {
		// Access data array directly
		dataPtr := (*[10000]C.SpiceInt)(cell.data)
		bodyIDs[i] = int(dataPtr[i])
	}

	return bodyIDs, nil
}

// getBodyName gets the name of a body by its ID
func getBodyName(id int) (string, error) {
	const nameLen = 256
	var name [nameLen]C.char
	var found C.SpiceBoolean

	C.bodc2n_c(C.SpiceInt(id), nameLen, &name[0], &found)

	if err := checkSpiceError(); err != nil {
		return "", err
	}

	if found == C.SPICEFALSE {
		return "", fmt.Errorf("name not found for body ID %d", id)
	}

	return C.GoString(&name[0]), nil
}

// checkSpiceError checks for SPICE errors and returns them as Go errors
func checkSpiceError() error {
	if C.failed_c() == C.SPICETRUE {
		const msgLen = 1841
		var msg [msgLen]C.char

		C.getmsg_c(C.CString("LONG"), msgLen, &msg[0])
		C.reset_c()

		return fmt.Errorf("SPICE error: %s", C.GoString(&msg[0]))
	}
	return nil
}
