# HypePool Chrome Extension

## Loading in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The HP icon will appear in your toolbar

## Usage

- Browse to any TikTok video, YouTube video, or Instagram reel
- A green **"Stake on HypePool"** button appears at the bottom-right
- Click it to open the HypePool submit page pre-filled with the video URL
- Or click the toolbar icon to see the popup

## Icons

The extension references `icon16.png`, `icon48.png`, `icon128.png`. To generate them:

```bash
npm install canvas
node create-icons.js
```

Or use the `icon.svg` as a reference to create your own PNGs.

## Dev vs Production

Change `APP_URL` in `content.js` and `popup.js` from `http://localhost:3000` to the production domain before publishing.
