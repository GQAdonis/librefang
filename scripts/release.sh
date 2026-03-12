#!/bin/bash
# Release script for LibreFang

set -e

# Get version from command line
if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "  Example: $0 0.3.48"
    exit 1
fi

TAG="v$1"

echo "Creating release: $TAG"

# Update version in Cargo.toml
sed -i.bak "s/^version = \".*\"/version = \"$1\"/" Cargo.toml
rm -f Cargo.toml.bak
git add Cargo.toml

# Delete local and remote tag if exists
git tag -d $TAG 2>/dev/null || true
git push origin :refs/tags/$TAG 2>/dev/null || true

# Create and push tag
git commit -m "chore: bump version to $TAG"
git tag $TAG
git push origin main && git push origin $TAG

echo "Release $TAG triggered!"
