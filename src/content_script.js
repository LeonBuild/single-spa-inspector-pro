// This script runs in the ISOLATED world (extension context)
// It can use browser.runtime.sendMessage but cannot access page variables directly

import browser from "webextension-polyfill";

// Listen for routing events from the MAIN world script
window.addEventListener("single-spa-inspector:routing-event", () => {
  browser.runtime.sendMessage({
    from: "single-spa",
    type: "routing-event",
  });
});
