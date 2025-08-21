#!/bin/bash

# This script renames all .js files to .tsx files in the frontend/src directory
# Warning: It replaces the original files by renaming them, so make sure to backup or commit changes before running.

TARGET_DIR="frontend/src"

echo "Renaming .js and .jsx files to .tsx or .ts based on content..."

find $TARGET_DIR -type f \( -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Check if file contains 'import React' (common in React components)
  if grep -q "import React" "$file"; then
    # Rename .js or .jsx to .tsx for React components
    newfile=$(echo "$file" | sed -E 's/\.(js|jsx)$/tsx/')
  else
    # Rename .js to .ts for non-React files
    newfile=$(echo "$file" | sed -E 's/\.js$/ts/')
  fi
  mv "$file" "$newfile"
  echo "Renamed $file to $newfile"
done

echo "Done renaming files."

