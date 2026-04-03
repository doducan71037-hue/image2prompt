# Safari Guide

This fork includes a Safari-ready web extension bundle workflow.

## Included in this repository

- The main extension source remains the single source of truth
- A generated Safari-compatible bundle is tracked at `safari-web-extension/`
- The bundle can be regenerated with `scripts/prepare-safari-bundle.sh`

## For Mac users who want to install locally

If you want to use this extension in Safari on your own Mac without packaging a native app:

- open Safari's temporary web extension folder install flow for macOS Safari
- choose the `safari-web-extension/` folder from this repository
- enable Safari developer-related options if Safari asks for them
- allow unsigned extensions if your Safari testing setup requires it

This path is appropriate for local use and testing on macOS.

## For developers who want to package or distribute

Regenerate the Safari bundle with:

```bash
./scripts/prepare-safari-bundle.sh
```

Output:

```text
safari-web-extension
```

If full Xcode is available, the next step is:

```bash
xcrun safari-web-extension-converter safari-web-extension
```

This creates the native Safari extension container project used for build, testing, and formal distribution.

## Current limitation

This repository includes the Safari-compatible extension bundle, but not a built `.app` or `.xcodeproj` container project.

## Repository note

- Safari support here is presented as a Safari-ready bundle flow
- This fork is maintained at `doducan71037-hue/image2prompt`
