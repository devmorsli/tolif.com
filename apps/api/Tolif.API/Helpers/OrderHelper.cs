// Thin alias — the canonical implementation lives in Application.Helpers
// so Infrastructure (email service) can also use it without circular deps.
global using OrderHelper = Tolif.Application.Helpers.OrderHelper;
