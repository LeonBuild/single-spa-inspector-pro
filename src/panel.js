import browser from "webextension-polyfill";

createPanel().catch((err) => {
  console.error("Something happened in createPanel()");
  throw err;
});

async function createPanel() {
  let portToBackground;

  const panel = await browser.devtools.panels.create(
    "single-spa Inspector Pro",
    "/logo-white-bgblue.png",
    "/build/panel.html"
  );

  panel.onShown.addListener((panelWindow) => {
    portToBackground = browser.runtime.connect({ name: "panel-devtools" });
    
    // Send init message with the inspected tabId
    portToBackground.postMessage({
      type: "init",
      tabId: browser.devtools.inspectedWindow.tabId,
    });
    
    portToBackground.onMessage.addListener((msg) => {
      const custEvent = new CustomEvent("ext-content-script", {
        detail: msg,
      });
      panelWindow.dispatchEvent(custEvent);
    });
  });

  panel.onHidden.addListener(() => {
    portToBackground.disconnect();
    portToBackground = null;
  });
}
