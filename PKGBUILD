pkgname=yomikiru
pkgver=VERSION_REPLACE
pkgrel=1
pkgdesc="An offline desktop reader for manga, comics, and novels. Offers a customizable reading experience with extensive settings, shortcuts, themes and layouts."
arch=("x86_64")
url="https://github.com/mienaiyami/yomikiru"
license=("MIT")

depends=(
  gtk3
  nss
  libxss
  alsa-lib
)

options=(!strip !debug)

source=("Yomikiru-linux-x64-${pkgver}.zip")
sha256sums=("SKIP")

package() {

  install -dm755 "$pkgdir/usr/lib/$pkgname"
  install -dm755 "$pkgdir/usr/bin"
  install -dm755 "$pkgdir/usr/share/applications"

  # extract electron bundle
  bsdtar -xf "$srcdir/Yomikiru-linux-x64-${pkgver}.zip" \
  --strip-components=1 \
  -C "$pkgdir/usr/lib/$pkgname"

  # launcher
  install -Dm755 /dev/stdin "$pkgdir/usr/bin/$pkgname" <<EOF
#!/bin/bash
exec /usr/lib/$pkgname/yomikiru "\$@"
EOF

  # desktop file
  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/$pkgname.desktop" <<EOF
[Desktop Entry]
Name=Yomikiru
Exec=$pkgname
Icon=$pkgname
Type=Application
Categories=Utility;
EOF

}