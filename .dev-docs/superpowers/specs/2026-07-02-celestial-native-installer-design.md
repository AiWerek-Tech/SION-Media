# Celestial Native Installer Design

## Objective

Replace the default Windows installer appearance with a professional assisted NSIS wizard aligned with SION Media's dark celestial identity while retaining native Windows reliability.

## Experience

The installer uses a branded dark-blue sidebar and compact header, Indonesian welcome and completion messaging, application/version identity, selectable installation directory, Start Menu and desktop shortcuts, visible installation progress, and an optional launch action at completion.

## Behavior

- Installation remains per-machine and requests elevation once.
- Existing installations are upgraded in place.
- User databases and application data are preserved during uninstall and upgrade.
- The desktop shortcut is recreated only according to the existing explicit product policy.
- Installer and uninstaller share the same visual identity.
- Silent installation remains supported by electron-builder/NSIS.

## Implementation Boundary

Use electron-builder's assisted NSIS target, reproducible bitmap assets generated from repository branding, and a small NSIS include for page copy. Avoid fully custom nsDialogs pages to keep packaging and accessibility risk low.

## Verification

Automated tests validate assisted-installer options, asset dimensions and bitmap signatures, required Indonesian copy, upgrade-safe data policy, and referenced file existence. Production packaging must compile the NSIS installer successfully.
