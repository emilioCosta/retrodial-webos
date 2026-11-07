# RetroDial

A television-first webOS client and companion interface for a self-hosted [Nostalgex](https://github.com/chadMueller/Nostalgex) installation.

## Current version: 0.2.0

This release introduces an independent TV-oriented channel catalogue interface.

- Bundles the upstream Nostalgex channel configuration (142 channels, 14 bundles, config v50).
- Browse all channels, filter by bundle, search by name/number, and save favorites locally.
- Remote-friendly focus states and keyboard navigation.
- Channel details show the channel number, source bundle, and a summary of its configured rules.
- The "Open Nostalgex" action launches the existing NAS web tuner at `http://192.168.1.33:8099/`.

## Important integration boundary

The bundled catalogue is the complete channel definition currently published by Nostalgex. It is **not** a report of which channels are populated by the user's media library. Actual availability depends on the connected Plex/Jellyfin/Emby library and the Nostalgex filtering, enrichment, and schedule engine.

This first independent UI release does not yet implement native channel tuning or playback. The existing Nostalgex tuner remains responsible for authentication, library scanning, schedule generation, and video playback. Direct integration with the media server and the Nostalgex channel/schedule logic is the next development phase.

## Data provenance

- `data/channels.json` is copied from `chadMueller/Nostalgex` (MIT), preserving its configuration and attribution.
- `data/franchises.json` is copied from the same upstream project (MIT).
- The upstream project name and branding remain the property of their respective owner. RetroDial is an independent community project.

## Configure NAS address

Change `NOSTALGEX_URL` in `app.js` if the Nostalgex server address changes.

## Build and install

Install the webOS TV CLI, then run:

```bash
ares-package .
ares-install --device YOUR_DEVICE_NAME <generated-ipk>
ares-launch --device YOUR_DEVICE_NAME com.emilio.retrodial
```

## License

RetroDial source code is provided under the MIT License. See `LICENSE`. The upstream Nostalgex project has its own MIT license and notices.
