#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

PROCESS_DIR="process"

read -rp "Enter FROM tag (e.g., release-1): " FROM_TAG
read -rp "Enter TO tag (e.g., release-2): " TO_TAG

echo ""
echo "🔁 Comparing changes between tags:"
echo "  FROM: $FROM_TAG"
echo "  TO:   $TO_TAG"
echo ""

# verify tags exist
if ! git rev-parse --verify "refs/tags/${FROM_TAG}" >/dev/null 2>&1; then
  echo "❌ Error: from-tag '${FROM_TAG}' not found in repo."
  exit 1
fi
if ! git rev-parse --verify "refs/tags/${TO_TAG}" >/dev/null 2>&1; then
  echo "❌ Error: to-tag '${TO_TAG}' not found in repo."
  exit 1
fi

# list changed JSON files between tags (Added/Modified/Renamed)
mapfile -t changed_files < <(git diff --name-only --diff-filter=AMR "${FROM_TAG}".."${TO_TAG}" -- '*.json' | sort -u)

if [ ${#changed_files[@]} -eq 0 ]; then
  echo "✅ No added/modified/renamed JSON files between ${FROM_TAG} and ${TO_TAG}."
  exit 0
fi

echo "🔍 Found ${#changed_files[@]} changed JSON file(s):"
printf ' - %s\n' "${changed_files[@]}"
echo ""

# Always clear and recreate process folder
echo "🧹 Clearing and recreating ./${PROCESS_DIR}/ directory..."
rm -rf -- "$PROCESS_DIR"
mkdir -p -- "$PROCESS_DIR"

# Helper: write file content to destination, preserving path
write_to_process() {
  local dest_rel="$1"   # path relative to repo, e.g. config/app.json
  local dest="$PROCESS_DIR/$dest_rel"
  local destdir
  destdir="$(dirname -- "$dest")"
  mkdir -p -- "$destdir"
  # If source file exists in workspace, copy it; otherwise try to extract from TO_TAG
  if [ -f "$dest_rel" ]; then
    cp -- "$dest_rel" "$dest"
    echo "📦 Copied from workspace: $dest_rel -> $dest"
    return 0
  fi

  # Try to get content from the TO_TAG commit
  if git cat-file -e "${TO_TAG}:${dest_rel}" 2>/dev/null; then
    # write blob to destination
    git show "${TO_TAG}:${dest_rel}" > "$dest"
    echo "📥 Extracted from tag ${TO_TAG}: $dest_rel -> $dest"
    return 0
  fi

  # If not found anywhere, warn
  echo "⚠️  Missing in workspace and not present in tag ${TO_TAG}: $dest_rel (skipped)"
  return 1
}

# Copy/extract each changed file
for f in "${changed_files[@]}"; do
  # normalize possible leading/trailing whitespace
  f="$(printf '%s' "$f")"
  write_to_process "$f"
done

echo ""
echo "✅ Done! All available changed JSON files have been copied to './${PROCESS_DIR}/'"

