#!/bin/bash
set -e

APP_NAME=yomikiru
PRODUCT_NAME=Yomikiru
VERSION=$(node -p "require('./package.json').version")
PKGVER=$(echo "$VERSION" | sed 's/-/_/g')

ZIP_FILE="out/make/zip/linux/x64/${PRODUCT_NAME}-linux-x64-${VERSION}.zip"

if [ ! -f "$ZIP_FILE" ]; then
  echo "Error: zip not found: $ZIP_FILE"
  exit 1
fi

echo "Preparing build directory..."
BUILD_DIR="arch-build"
rm -rf "$BUILD_DIR"
mkdir "$BUILD_DIR"

cp PKGBUILD "$BUILD_DIR/"
cp "$ZIP_FILE" "$BUILD_DIR/${APP_NAME}-linux-x64-${PKGVER}.zip"

cd "$BUILD_DIR"

echo "Updating PKGBUILD version..."

sed -i "s/VERSION_REPLACE/${PKGVER}/g" PKGBUILD

echo "Building Arch package with Docker..."

if ! docker run --rm \
    -v "${PWD}:/build" \
    archlinux:latest \
    bash -c "
      pacman -Sy --noconfirm base-devel libarchive &&
      useradd -m builder &&
      chown -R builder:builder /build &&
      su builder -c 'cd /build && makepkg -f --noconfirm'
    "; then
  echo "Error: Docker build failed"
  exit 1
fi

mkdir -p ../out/all
MAIN_PKG=$(find . -maxdepth 1 -name "${APP_NAME}-*-x86_64.pkg.tar.*" | head -n1)
mv "$MAIN_PKG" ../out/all/

echo "Build complete: out/all/$(basename "$MAIN_PKG")"