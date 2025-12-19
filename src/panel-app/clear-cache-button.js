import React, { useState } from "react";
import { useCss, always } from "kremling";
import browser from "webextension-polyfill";

export default function ClearCacheButton({ sharedState, setSharedState }) {
  const styles = useCss(css);
  
  // 使用共享状态或本地状态
  const [localIsClearing, setLocalIsClearing] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);
  
  const isClearing = sharedState ? sharedState.isClearing : localIsClearing;
  const status = sharedState ? sharedState.status : localStatus;
  
  const setIsClearing = (value) => {
    if (sharedState && setSharedState) {
      setSharedState(prev => ({ ...prev, isClearing: value }));
    } else {
      setLocalIsClearing(value);
    }
  };
  
  const setStatus = (value) => {
    if (sharedState && setSharedState) {
      setSharedState(prev => ({ ...prev, status: value }));
    } else {
      setLocalStatus(value);
    }
  };

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
      // Silently handle extension context invalidation
      if (error.message && error.message.includes("Extension context invalidated")) {
        console.debug("[single-spa-inspector-pro] Service worker terminated during clear cache");
        setStatus("error");
      } else {
        setStatus("error");
        console.error("Error sending clear-cache message:", error);
      }
    } finally {
      setIsClearing(false);
      // Reset status after 2 seconds
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const getButtonText = () => {
    if (isClearing) return "Clearing...";
    if (status === "success") return "Cleared!";
    if (status === "error") return "Failed";
    return "Clear Cache & Refresh";
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
  background-color: #1e8e3e;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: .9rem;
  font-weight: 600;
  padding: .5rem 1.5rem;
  transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  white-space: nowrap;
  text-align: center;
  line-height: 1.4;
  user-select: none;
  box-sizing: border-box;
  min-width: 220px;
}

& .clear-cache-btn:hover:not(:disabled) {
  background-color: #187a34;
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
