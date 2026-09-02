# Custom Icons — `img/icons/`

Place your custom icon files here (SVG, PNG, or other image formats) to use them as screen-button icons in the Dashticz topbar.

## Usage in CONFIG.js

```javascript
// Font Awesome icon (no file needed — uses the bundled Font Awesome library)
screens[1]['icon'] = 'fas fa-home';
screens[2]['icon'] = 'fas fa-film';
screens[3]['icon'] = 'fas fa-music';

// Custom image file placed in this directory
screens[1]['icon'] = 'img/icons/home.svg';
screens[2]['icon'] = 'img/icons/camera.png';

// Standby button icon (either approach)
standby_screen['icon'] = 'fas fa-moon';
config['standby_icon'] = 'img/icons/sleep.svg';
```

## Icon Sources

- **Font Awesome** (free tier): https://fontawesome.com/icons — use the class string directly (e.g. `fas fa-home`).
- **Streamline HQ** (Core Duo Free): https://www.streamlinehq.com/icons/core-duo-free — download SVG files and save them here.
- Any 16×16 or 24×24 SVG or PNG image works.

## Notes

- SVG files display crisply at any size.
- Images are rendered at **16 × 16 px** inside the button by default.
- If no icon is configured for a screen, the button falls back to showing the screen number (or "S" for Standby).
- Backward compatibility is preserved: existing CONFIG.js files without `icon` keys continue to work unchanged.
