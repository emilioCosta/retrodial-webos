# RetroDial

A minimal webOS TV client for a self-hosted [Nostalgex](https://github.com/chadMueller/Nostalgex) instance.

## Design goal

RetroDial does **not** reimplement Nostalgex. It launches the original self-hosted Nostalgex web tuner directly inside the webOS app's web runtime. The guide, channel lineup, server connection/sign-in, schedules, and video playback remain the original Nostalgex implementation running on the NAS.

This keeps one source of truth and avoids maintaining a second player or channel guide.

## Configured server

The current installation is configured to open:

```
http://192.168.1.33:8080/
```

To point the app at another server, change `NOSTALGEX_URL` in `app.js`.

## Project files

- `appinfo.json` — webOS application metadata
- `index.html` and `style.css` — brief connection/loading fallback
- `app.js` — immediate navigation to the original Nostalgex tuner

## Package for webOS

Install the webOS TV CLI, then run from this directory:

```bash
ares-package .
```

Install and launch the resulting package using a paired TV device:

```bash
ares-install --device YOUR_DEVICE_NAME com.emilio.retrodial_0.1.0_all.ipk
ares-launch --device YOUR_DEVICE_NAME com.emilio.retrodial
```

The package has not yet been built or tested on a physical LG TV.

## Important compatibility note

The app opens the exact same web interface that is already working in the LG TV browser. However, the webOS app runtime and the TV browser may differ in navigation, media codecs, remote-key handling, and playback behavior. Those details must be validated on the TV. If the original tuner works in the browser but not in the app runtime, the next step is to address that specific compatibility issue—not to rewrite the Nostalgex interface.

## License

RetroDial source code is provided under the MIT License. Nostalgex is a separate upstream project with its own license and notices.
