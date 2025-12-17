// Background script for single-spa Inspector
// Runs as a Service Worker in Manifest V3

import browser from "webextension-polyfill";

// Store active connections to devtools panels
// Map of tabId -> port
// Note: In Service Worker, this state may be lost when worker is terminated
// But connections will be re-established when panel is opened
let portsToPanel = new Map();

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((msg, sender) => {
  // Forward message to the devtools panel for the same tab
  const tabId = sender.tab?.id;
  if (tabId) {
    const port = portsToPanel.get(tabId);
    if (port) {
      try {
        port.postMessage(msg);
      } catch (e) {
        // Port might be disconnected
        portsToPanel.delete(tabId);
      }
    }
  }
});

// Listen for connections from devtools panels
browser.runtime.onConnect.addListener((port) => {
  if (port.name !== "panel-devtools") return;
  
  // Get the tabId from the port name or use a message to set it
  port.onMessage.addListener((msg) => {
    if (msg.type === "init" && msg.tabId) {
      portsToPanel.set(msg.tabId, port);
    }
  });

  port.onDisconnect.addListener(() => {
    // Remove the port from the map
    for (const [tabId, p] of portsToPanel.entries()) {
      if (p === port) {
        portsToPanel.delete(tabId);
        break;
      }
    }
  });
});
