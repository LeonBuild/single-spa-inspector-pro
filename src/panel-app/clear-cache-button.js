import React, { useState } from "react";
import { useCss, always } from "kremling";
import browser from "webextension-polyfill";

export default function ClearCacheButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState(null); // null, 'success', 'error'
  const styles = useCss(css);

  const handleClearCache = async () => {
    if (isClearing) return;
    
    setIsClearing(true);
    setStatus(null);

    try {
      const tabId = browser.devtools.inspectedWindow.tabId;
      const response = await browser.runtime.sendMessage({
        type: "clear-cache",
        tabId,
        dataTypes: {
          cache: true,
          cacheStorage: true,
          serviceWorkers: true
        }
      });

      if (response?.success) {
        setStatus("success");
      } else {
        setStatus("error");
        console.error("Clear cache failed:", response?.error);
      }
    } catch (error) {
      setStatus("error");
      console.error("Error sending clear-cache message:", error);
    } finally {
      setIsClearing(false);
      // Reset status after 2 seconds
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const getButtonText = () => {
    if (isClearing) return "Clearing...";
    if (status === "success") return "✓ Cleared!";
    if (status === "error") return "✗ Failed";
    return "🗑️ Clear Cache & Refresh";
  };

  return (
    <button
      {...styles}
      className={always("clear-cache-btn")
        .maybe("clearing", isClearing)
        .maybe("success", status === "success")
        .maybe("error", status === "error")}
      onClick={handleClearCache}
      disabled={isClearing}
      title="Clear browser cache (HTTP cache, Service Workers, Cache Storage) and refresh the page"
    >
      {getButtonText()}
    </button>
  );
}

const css = `
& .clear-cache-btn {
  background-color: #28cb51;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 0;
  transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  white-space: nowrap;
  width: 200px;
  text-align: center;
}

& .clear-cache-btn:hover:not(:disabled) {
  background-color: #22b047;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

& .clear-cache-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}

& .clear-cache-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

& .clear-cache-btn.clearing {
  background-color: #6c757d;
}

& .clear-cache-btn.success {
  background-color: #28cb51;
}

& .clear-cache-btn.error {
  background-color: #e62e5c;
}
`;
