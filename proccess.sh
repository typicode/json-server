#!/usr/bin/env bash
set -euo pipefail

FROM_TAG="${1:-release-1}"
TO_TAG="${2:-release-2}"

# Ensure tags exist
if ! git rev-parse --verify "refs/tags/${FROM_TAG}" >/dev/null 2>&1; then
  echo "Error: from-tag ${FROM_TAG} not found"
  exit 1
fi
if ! git rev-parse --verify "refs/tags/${TO_TAG}" >/dev/null 2>&1; then
  echo "Error: to-tag ${TO_TAG} not found"
  exit 1
fi

# List changed files between tags: Added (A), Modified (M), Renamed (R)
# Filter to JSON files only. Sort unique.
mapfile -t changed_files < <(git diff --name-only --diff-filter=AMR "${FROM_TAG}".."${TO_TAG}" -- '*.json' | sort -u)

if [ ${#changed_files[@]} -eq 0 ]; then
  echo "No added/modified/renamed JSON files between ${FROM_TAG} and ${TO_TAG}."
  exit 0
fi

echo "JSON files changed between ${FROM_TAG} and ${TO_TAG}:"
printf ' - %s\n' "${changed_files[@]}"

# Example processing function — replace with your real logic
process_json() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "Processing file: $file"
    # Example validation: pretty-print with jq (if installed)
    if command -v jq >/dev/null 2>&1; then
      jq . "$file" > /dev/null || echo "Warning: $file is not valid JSON"
    fi
    # Replace below with your deploy/upload/validate command
    # ./deploy-json.sh "$file"
  else
    echo "Warning: $file not found in workspace. Maybe it was deleted or renamed. Skipping."
  fi
}

for f in "${changed_files[@]}"; do
  process_json "$f"
done

