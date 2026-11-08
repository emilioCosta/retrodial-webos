# RetroDial 0.6.0

RetroDial is an independent, TV-first personal media application for LG webOS. Jellyfin remains the media library and playback server; the TV interface does not open Nostalgex or ask the viewer to choose a provider or log in.

## TV experience in this release

- **Ao vivo:** cada canal tem uma programação linear. A lista do canal é embaralhada uma vez por dia (semente = data + canal), colocada em sequência a partir da meia-noite e repetida em loop. A posição atual vem do relógio, então ao sintonizar você entra no meio do episódio, como na TV. Todos os aparelhos veem a mesma grade.
- **Tela principal:** ao abrir, sintoniza automaticamente o último canal e mostra o vídeo, a descrição do programa e a faixa de programação com horários na parte inferior.
- **Programação:** `←→` percorrem os programas; `↑↓` trocam de canal; `OK` seleciona o programa e abre a reprodução em tela cheia.
- **Tela cheia:** `↑↓` / CH+ CH− trocam de canal; `OK` revela novamente a programação; `VOLTAR` fecha a programação e, em seguida, sai do player.
- Ao terminar um item, o próximo da grade começa do início. Itens com erro são pulados.
- Episódios da mesma série são espalhados para não tocar em sequência.
- Home: "O que está passando" mostra o programa que está no ar agora em cada canal.

## Limitações

A grade é **gerada a partir da sua biblioteca Jellyfin**; não é EPG de emissora nem tem transmissão ao vivo real. Os horários são calculados pelo servidor (fuso em `TZ_NAME`) e a reprodução é feita pelo próprio aparelho, item a item, sem um servidor de playout 24/7.

- Entrar no meio do episódio depende do Jellyfin aceitar requisições `Range` para o arquivo; se o aparelho não conseguir posicionar, o item começa do início.
- Pequenas diferenças entre a duração cadastrada e a real do arquivo podem deslocar a hora exibida; ao trocar de canal a grade volta a se alinhar com o relógio.
- A grade muda quando o dia vira (meia-noite no fuso configurado) ou se a biblioteca for atualizada com `?refresh=1`.
- Pausar o vídeo ao vivo desloca o fim do item em relação à grade.

## Architecture

- `server/index.js`: Node.js API authenticating to the configured Jellyfin account, discovering Movie/Episode items, creating thematic channels, building the daily schedule (`/api/guide`, `/api/channels/:id/schedule`), and proxying images and streams.
- `index.html`, `style.css`, `app.js`: standalone RetroDial TV interface.
- `docker-compose.yml`: NAS deployment on host port 8100.

## Jellyfin configuration

The server reads `JELLYFIN_URL`, `JELLYFIN_USERNAME`, `JELLYFIN_PASSWORD` and `TZ_NAME` (default `America/Sao_Paulo`) from its environment. The credentials stay on the NAS; they are not embedded in the webOS app. The current installation defaults are documented in the deployment environment, not in the client.

## Deploy API on OpenMediaVault

From the project directory on the NAS, copy `.env.example` to `.env` and fill in the Jellyfin credentials (the compose file refuses to start without them):

```bash
cp .env.example .env
docker compose up -d --build
docker logs -f retrodial-api
```

Health check: `http://NAS-IP:8100/api/health`.

## Package for LG webOS

Package the static webOS client with the installed webOS CLI tools. Confirm the API base URL (`DEFAULT_API` in `app.js`) points to the NAS, and increment `appinfo.json` version for each release. The IPK must be installed on the TV after packaging; updating GitHub does not update the installed TV app automatically.

## Test checklist

1. Abrir o RetroDial direto, sem login.
2. Home → "ASSISTIR AO VIVO": entra no meio de um programa e mostra o título e "A SEGUIR".
3. `OK` abre o guia; `▲▼` troca de canal e a prévia sintoniza; `OK` volta para tela cheia.
4. Digitar o número de um canal (ex.: `3`) sintoniza esse canal.
5. CH+/CH− e `▲▼` em tela cheia trocam de canal.
6. Deixar um item terminar: o próximo da grade começa.
7. `VOLTAR` fecha o guia e depois sai; na busca, Backspace apaga texto.
8. Registrar falhas com descrição e, se possível, foto ou vídeo.
