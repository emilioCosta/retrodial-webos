# RetroDial 0.4.0

RetroDial is an independent, TV-first personal media application for LG webOS. Jellyfin remains the media library and playback server; the TV interface does not open Nostalgex or ask the viewer to choose a provider or log in.

## TV experience in this release

- Home screen with channel rails and a direct "watch now" action.
- Channel browser and a guide-style grid built from the items available in each Jellyfin channel.
- Selecting a channel can start its first item immediately; the channel page also offers an explicit Watch Now action.
- Full-screen playback with play/pause, previous/next item, and channel up/down controls.
- Automatic next-item playback when the current video ends, while items remain in the selected channel.
- Remote-friendly focus outlines, directional navigation, OK/Enter selection, and Back/Escape handling.

## Important guide and playback limitations

The guide in 0.4.0 is an **illustrative, locally generated guide**, not a real broadcast EPG. It uses sample items returned by the RetroDial API and displays them in guide rows; it does not contain broadcaster schedules, accurate programme start/end times, or live TV streams. The "Now" and following slots are a presentation of the personal library, not a claim that a programme is currently airing.

Channel playback is also an on-demand sequence from the channel's Jellyfin item list. Automatic next-item playback advances through that list; it is not yet a 24/7 playout scheduler. The order follows the list returned by the API, and the current release does not promise episode-order normalization for every series.

## Architecture

- `server/index.js`: Node.js API authenticating to the configured Jellyfin account, discovering Movie/Episode items, creating thematic channels, and proxying images and streams.
- `index.html`, `style.css`, `app.js`: standalone RetroDial TV interface.
- `docker-compose.yml`: NAS deployment on host port 8100.

## Jellyfin configuration

The server reads `JELLYFIN_URL`, `JELLYFIN_USERNAME`, and `JELLYFIN_PASSWORD` from its environment. The credentials stay on the NAS; they are not embedded in the webOS app. The current installation defaults are documented in the deployment environment, not in the client.

## Deploy API on OpenMediaVault

From the project directory on the NAS:

```bash
docker compose up -d --build
docker logs -f retrodial-api
```

Health check: `http://NAS-IP:8100/api/health`.

## Package for LG webOS

Package the static webOS client with the installed webOS CLI tools. Confirm the API base URL in `app.js` points to the NAS, and increment `appinfo.json` version for each release. The IPK must be installed on the TV after packaging; updating GitHub does not update the installed TV app automatically.

## Test checklist

1. Launch RetroDial directly, without Nostalgex or a login screen.
2. Navigate the home screen, channel list, and guide using the LG remote.
3. Confirm the focus indicator is visible and consistent.
4. Open a channel and start playback.
5. Test play/pause, Back, previous/next item, and channel up/down.
6. Let an item finish to verify automatic next-item playback when the channel has another item.
7. Record failures with a description and, if possible, a photo or video.

The guide is illustrative and the channel sequence is on-demand; do not treat them as live broadcast EPG or 24/7 playout features.
