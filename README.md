# RetroDial

A lightweight webOS TV launcher for a self-hosted Nostalgex server. RetroDial is an independent companion project; it does not bundle or modify Nostalgex.

## Current status

**MVP launcher (0.1.0).** The app provides a TV-oriented start screen, remembers the server URL, and opens the existing Nostalgex web interface. Playback, channel data, and the guide remain hosted by Nostalgex on the NAS.

Default server: `http://192.168.1.33:8080`

## Project structure

- `appinfo.json` — webOS application metadata
- `index.html` — launcher screen
- `style.css` — 1920×1080 TV layout
- `app.js` — server URL persistence and navigation

## Package for webOS

Install the webOS TV CLI on a development machine, then from this directory run:

```bash
ares-package .
```

This should produce an `.ipk` package. The package has not yet been built or tested on a physical LG TV.

For Developer Mode installation, pair the TV with the CLI and use:

```bash
ares-install --device YOUR_DEVICE_NAME com.emilio.retrodial_0.1.0_all.ipk
ares-launch --device YOUR_DEVICE_NAME com.emilio.retrodial
```

Exact CLI setup and device pairing depend on the installed webOS TV SDK version.

## Notes and limitations

- This is a launcher, not yet a native channel browser.
- The Nostalgex server must be reachable from the TV over the local network.
- The browser engine on webOS may impose navigation or playback limitations. Validate on the target TV.
- The MVP uses browser local storage to remember the server URL.
- The icon assets referenced by `appinfo.json` will be added in a subsequent packaging pass.

## License

RetroDial source code is provided under the MIT License. See [LICENSE](LICENSE).

Nostalgex is a separate upstream project: https://github.com/chadMueller/Nostalgex
