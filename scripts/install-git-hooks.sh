#!/bin/sh
#
# Install git hooks
#

# Only install hooks if .git directory exists
if [ -d ".git" ]; then
  # Ensure .git/hooks directory exists
  mkdir -p .git/hooks
  
  # Copy pre-commit hook
  cp scripts/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  
  echo "Git hooks installed successfully!"
else
  echo "Not a git repository, skipping hook installation"
fi
