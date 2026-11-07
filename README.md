# RetroDial 0.3.0

RetroDial is an independent, TV-first personal media channel application. It uses Jellyfin as its media library and playback server. It does not require the Nostalgex web UI or a Plex/Jellyfin provider selection screen.

## Architecture

- `server/index.js`: small Node.js API that authenticates to one configured Jellyfin account, discovers its Movie/Episode library, creates thematic channels from actual library genres and metadata, and proxies playback.
- `index.html`, `style.css`, `app.js`: RetroDial's own television interface.
- `docker-compose.yml`: NAS deployment on host port 8100.

## Jellyfin configuration

Defaults are set for this installation:
- Jellyfin: `http://192.168.1.33:8096`
- Username: `a`
- Password: `a`

Override with `JELLYFIN_URL`, `JELLYFIN_USERNAME`, and `JELLYFIN_PASSWORD`. Credentials are stored only in the NAS container environment, not in the webOS app.

## Deploy API on OpenMediaVault

Copy the repository to the NAS (or use the folder containing these files), then run:

```bash
docker compose up -d --build
docker logs -f retrodial-api
```

API health check: `http://NAS-IP:8100/api/health`.

The webOS client needs to be hosted from the same origin as this API, or configured to use the API base URL. The current webOS package is a static client; for a standalone IPK, package the static client with a local API URL pointing at the NAS.

## Important scope

This first independent release creates channels dynamically from the media actually found in Jellyfin. It is not yet a continuous 24/7 schedule: deterministic per-channel scheduling, automatic next-item playback, guide grid/EPG, resume/continue watching, and richer collection/franchise inference are planned next. It scans the first 10,000 Movie/Episode records; larger libraries will need pagination.

## Credentials and security

The default `a/a` credentials are installation-specific. The server should be reachable only on the trusted home network. Prefer a dedicated Jellyfin user with read-only library access and a unique password.
