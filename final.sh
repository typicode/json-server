#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

PROCESS_DIR="process"

# --- Step 1: Ask for user input ---
read -rp "Enter FROM tag (e.g., release-1): " FROM_TAG
read -rp "Enter TO tag (e.g., release-2): " TO_TAG

echo ""
echo "🔁 Comparing changes between tags:"
echo "  FROM: $FROM_TAG"
echo "  TO:   $TO_TAG"
echo ""

# --- Step 2: Verify tags exist ---
if ! git rev-parse --verify "refs/tags/${FROM_TAG}" >/dev/null 2>&1; then
  echo "❌ Error: from-tag '${FROM_TAG}' not found in repo."
  exit 1
fi

if ! git rev-parse --verify "refs/tags/${TO_TAG}" >/dev/null 2>&1; then
  echo "❌ Error: to-tag '${TO_TAG}' not found in repo."
  exit 1
fi

# --- Step 3: Get list of changed JSON files (Added/Modified/Renamed) ---
mapfile -t changed_files < <(git diff --name-only --diff-filter=AMR "${FROM_TAG}".."${TO_TAG}" -- '*.json' | sort -u)

if [ ${#changed_files[@]} -eq 0 ]; then
  echo "✅ No added/modified/renamed JSON files between ${FROM_TAG} and ${TO_TAG}."
  exit 0
fi

echo "🔍 Found ${#changed_files[@]} changed JSON file(s):"
printf ' - %s\n' "${changed_files[@]}"
echo ""

# --- Step 4: Always clear and recreate process folder ---
echo "🧹 Clearing and recreating ./${PROCESS_DIR}/ directory..."
rm -rf -- "$PROCESS_DIR"
mkdir -p -- "$PROCESS_DIR"

# --- Step 5: Copy changed files preserving their directory paths ---
copy_file_preserve_path() {
  local src="$1"
  if [ ! -f "$src" ]; then
    echo "⚠️  Skipping missing file: $src"
    return
  fi

  local dest="$PROCESS_DIR/$src"
  local destdir
  destdir="$(dirname -- "$dest")"

  mkdir -p -- "$destdir"
  cp -- "$src" "$dest"
  echo "📦 Copied: $src -> $dest"
}

for f in "${changed_files[@]}"; do
  copy_file_preserve_path "$f"
done

echo ""
echo "✅ Done! All changed JSON files have been copied to './${PROCESS_DIR}/'"

