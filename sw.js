// Service worker mínimo: permite instalar a gestão como app no celular e no computador.
// Não guarda dados em cache; tudo vem sempre da rede.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
