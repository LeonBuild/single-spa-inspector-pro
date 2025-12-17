// This script runs in the MAIN world (page context)
// It can access window.__SINGLE_SPA_DEVTOOLS__ directly

// Install devtools object
if (!window.__SINGLE_SPA_DEVTOOLS__) {
  Object.defineProperty(window, "__SINGLE_SPA_DEVTOOLS__", {
    value: {},
  });
}

// Setup force mount/unmount functions
(function setupMountAndUnmount() {
  const forceMount = forceMountUnmount.bind(null, true);
  const forceUnmount = forceMountUnmount.bind(null, false);

  function revertForceMountUnmount(appName) {
    const { reroute } = window.__SINGLE_SPA_DEVTOOLS__.exposedMethods;

    const app = getAppByName(appName);
    if (app.devtools.activeWhenBackup) {
      app.activeWhen = app.devtools.activeWhenBackup;
      delete app.devtools.activeWhenBackup;
      delete app.devtools.activeWhenForced;
    }
    reroute();
  }

  function forceMountUnmount(shouldMount, appName) {
    const {
      getRawAppData,
      toLoadPromise,
      toBootstrapPromise,
      NOT_LOADED,
      reroute,
    } = window.__SINGLE_SPA_DEVTOOLS__.exposedMethods;
    const app = getRawAppData().find((rawapp) => rawapp.name === appName);

    if (!app.devtools.activeWhenBackup) {
      app.devtools.activeWhenBackup = app.activeWhen;
    }

    app.devtools.activeWhenForced = shouldMount ? "on" : "off";
    app.activeWhen = () => shouldMount;

    if (shouldMount && app.status === NOT_LOADED) {
      toLoadPromise(app)
        .then(() => toBootstrapPromise(app))
        .then(() => reroute())
        .catch((err) => {
          console.error(
            `Something failed in the process of loading and bootstrapping your force mounted app (${app.name}):`,
            err
          );
          throw err;
        });
    } else {
      reroute();
    }
  }

  function getAppByName(appName) {
    const { getRawAppData } = window.__SINGLE_SPA_DEVTOOLS__.exposedMethods;
    return getRawAppData().find((rawApp) => rawApp.name === appName);
  }

  window.__SINGLE_SPA_DEVTOOLS__.forceUnmount = forceUnmount;
  window.__SINGLE_SPA_DEVTOOLS__.forceMount = forceMount;
  window.__SINGLE_SPA_DEVTOOLS__.revertForceMountUnmount = revertForceMountUnmount;
})();

// Setup overlay helpers
(function setupOverlayHelpers() {
  const overlays = {};

  function overlay(appName) {
    const { getRawAppData } = window.__SINGLE_SPA_DEVTOOLS__.exposedMethods;
    const app = getRawAppData().find((rawApp) => rawApp.name === appName);
    const devtools = app.devtools;
    if (!devtools || !devtools.overlays) return;

    const options = devtools.overlays.options || {};
    const selectors = devtools.overlays.selectors;

    selectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (!el) return;

      const overlayDiv = createOverlayDiv(appName, options);
      el.style.position = "relative";
      el.appendChild(overlayDiv);
      overlays[appName] = overlays[appName] || [];
      overlays[appName].push(overlayDiv);
    });
  }

  function removeOverlay(appName) {
    if (overlays[appName]) {
      overlays[appName].forEach((overlayDiv) => overlayDiv.remove());
      delete overlays[appName];
    }
  }

  function createOverlayDiv(appName, options) {
    const overlayDiv = document.createElement("div");
    overlayDiv.id = `single-spa-inspector-overlay-${appName}`;

    const color = options.color || getColor(appName);
    const background = options.background || getColor(appName, 0.1);

    overlayDiv.style.width = options.width || "100%";
    overlayDiv.style.height = options.height || "100%";
    overlayDiv.style.zIndex = options.zIndex || 40;
    overlayDiv.style.position = options.position || "absolute";
    overlayDiv.style.top = options.top || 0;
    overlayDiv.style.left = options.left || 0;
    overlayDiv.style.background = background;
    overlayDiv.style.border = `2px solid ${color}`;
    overlayDiv.style.pointerEvents = "none";
    overlayDiv.style.display = "flex";
    overlayDiv.style.flexDirection = "column";
    overlayDiv.style.justifyContent = "center";
    overlayDiv.style.alignItems = "center";
    overlayDiv.style.color = color;
    overlayDiv.style.fontWeight = "bold";
    overlayDiv.style.fontSize = "16px";

    const nameDiv = document.createElement("div");
    nameDiv.textContent = appName;
    overlayDiv.appendChild(nameDiv);

    if (options.textBlocks) {
      options.textBlocks.forEach((text) => {
        const textDiv = document.createElement("div");
        textDiv.textContent = text;
        overlayDiv.appendChild(textDiv);
      });
    }

    return overlayDiv;
  }

  function getColor(appName, alpha = 1) {
    let hash = 0;
    for (let i = 0; i < appName.length; i++) {
      hash = appName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsla(${h}, 70%, 50%, ${alpha})`;
  }

  window.__SINGLE_SPA_DEVTOOLS__.overlay = overlay;
  window.__SINGLE_SPA_DEVTOOLS__.removeOverlay = removeOverlay;
})();

// Dispatch event when single-spa routing happens
// This will be caught by the isolated content script
window.addEventListener("single-spa:routing-event", () => {
  window.dispatchEvent(new CustomEvent("single-spa-inspector:routing-event"));
});

