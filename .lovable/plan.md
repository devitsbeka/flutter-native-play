

## Set New App Icon

The uploaded image (`App-icon.png`) will be used as the app's icon across all platforms — favicon, Apple touch icon, and PWA icon.

### Changes

1. **Copy the image to the public folder** as `app-icon.png`, replacing the existing icon assets.

2. **Update `index.html`**:
   - Add a `<link rel="icon">` pointing to the new icon
   - Update the `apple-touch-icon` reference to use the new image

3. **Update `public/manifest.json`**:
   - Update the icon entry to reference the new `app-icon.png` file

### Technical Details

- The uploaded image will be copied to `public/app-icon.png`
- `index.html` will get a new favicon link: `<link rel="icon" href="/app-icon.png" type="image/png">`
- The existing `apple-touch-icon` link will be updated to point to `/app-icon.png`
- `manifest.json` icon src will be updated from `/apple-touch-icon.png` to `/app-icon.png`

