(() => {
  // Fixed NAS address configured for this installation.
  // Nostalgex remains responsible for sign-in, channel guide and playback.
  const NOSTALGEX_URL = "http://192.168.1.33:8099/";

  const status = document.getElementById("connection-status");
  const retry = document.getElementById("retry");

  function openNostalgex() {
    status.textContent = "Conectando a " + NOSTALGEX_URL;
    window.location.replace(NOSTALGEX_URL);
  }

  retry.addEventListener("click", openNostalgex);
  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && !retry.hidden) openNostalgex();
  });

  // No extra launcher screen or duplicate guide: open the original tuner.
  openNostalgex();
})();