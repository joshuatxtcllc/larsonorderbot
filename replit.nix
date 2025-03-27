
{pkgs}: {
  deps = [
    pkgs.run
    pkgs.gobject-introspection
    pkgs.glib
    pkgs.gtk3
    pkgs.libgcc
    pkgs.chromium
    pkgs.xorg.libxshmfence
    pkgs.nodejs
  ];
}
