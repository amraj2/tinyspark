/* Registers the service worker so the app can be installed and used offline. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/11plus/sw.js", {scope: "/11plus/"}).catch(() => { /* offline support is optional */ });
  });
}
