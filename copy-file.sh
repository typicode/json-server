#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Usage:
#   ./copy-changed-json-to-process.sh [FROM_TAG] [TO_TAG] [--clear]
# Defaults: FROM_TAG=release-1, TO_TAG=release-2
# If --clear is passed as third arg, process/ will be removed first.

FROM_TAG="${1:-release-1}"
TO_TAG="${2:-release-2}"
CLEAR_FLAG="${3:-}"

PROCESS_DIR="process"

# Optional: clear process dir first if user passed --clear
if [ "$CLEAR_FLAG" = "--clear" ]; then
  echo "Clearing existing $PROCESS_DIR directory..."
  rm -rf -- "$PROCESS_DIR"
fi

# Ensure tags exist
if ! git rev-parse --verify "refs/tags/${FROM_TAG}" >/dev/null 2>&1; then
  echo "Error: from-tag ${FROM_TAG} not found"
  exit 1
fi
if ! git rev-parse --verify "refs/tags/${TO_TAG}" >/dev/null 2>&1; then
  echo "Error: to-tag ${TO_TAG} not found"
  exit 1
fi

# Build the list of changed JSON files (Added/Modified/Renamed)
mapfile -t changed_files < <(git diff --name-only --diff-filter=AMR "${FROM_TAG}".."${TO_TAG}" -- '*.json' | sort -u)

if [ ${#changed_files[@]} -eq 0 ]; then
  echo "No added/modified/renamed JSON files between ${FROM_TAG} and ${TO_TAG}."
  exit 0
fi

echo "Found ${#changed_files[@]} JSON file(s) to copy:"
printf ' - %s\n' "${changed_files[@]}"

# Create process dir
mkdir -p -- "$PROCESS_DIR"

copy_file_preserve_path() {
  local src="$1"
  # If src doesn't exist (e.g., deleted), skip with a warning
  if [ ! -f "$src" ]; then
    echo "Warning: source file '$src' not found in workspace. Skipping."
    return 0
  fi

  # Destination path inside process/ preserving directories
  local dest="$PROCESS_DIR/$src"
  local destdir
  destdir="$(dirname -- "$dest")"

  mkdir -p -- "$destdir"
  cp -- "$src" "$dest"
  echo "Copied: $src -> $dest"
}

# Copy each file
for f in "${changed_files[@]}"; do
  # Trim whitespace (safety)
  f="$(echo -n "$f")"
  copy_file_preserve_path "$f"
done

echo "Done. Files are under ./${PROCESS_DIR}/"

