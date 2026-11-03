/**
 * Captures the browser install prompt before React hydrates.
 * beforeinstallprompt fires once; if we miss it the header button cannot open the dialog.
 */
(function capturePwaInstallPrompt() {
  window.__addonPwaPrompt = window.__addonPwaPrompt || null;

  window.addEventListener("beforeinstallprompt", function onBeforeInstallPrompt(event) {
    event.preventDefault();
    window.__addonPwaPrompt = event;
    window.dispatchEvent(new Event("addon-pwa-prompt"));
  });

  window.addEventListener("appinstalled", function onAppInstalled() {
    window.__addonPwaPrompt = null;
    window.dispatchEvent(new Event("addon-pwa-installed"));
  });
})();
