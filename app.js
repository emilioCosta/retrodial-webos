(() => {
  const input = document.getElementById("server-url");
  const button = document.getElementById("open-guide");
  const status = document.getElementById("status");
  const saved = localStorage.getItem("retrodial.serverUrl");

  if (saved) input.value = saved;

  function openGuide() {
    const raw = input.value.trim();
    let target;

    try {
      target = new URL(raw);
      if (!["http:", "https:"].includes(target.protocol)) throw new Error("protocol");
    } catch (_) {
      status.textContent = "Informe um endereço HTTP ou HTTPS válido.";
      input.focus();
      return;
    }

    localStorage.setItem("retrodial.serverUrl", target.origin);
    status.textContent = "Abrindo o guia…";
    window.location.href = target.href;
  }

  button.addEventListener("click", openGuide);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") openGuide();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") button.focus();
  });

  button.focus();
})();