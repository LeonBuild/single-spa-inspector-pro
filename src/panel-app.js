import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { evalDevtoolsCmd, ProtocolError } from "./inspected-window.helper";
import browser from "webextension-polyfill";
import Apps from "./panel-app/apps.component";
import ErrorBoundary from "./panel-app/ErrorBoundary.component";
import Profiler from "./profiler/profiler.js";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@reach/tabs";
import "@reach/tabs/styles.css";

// 判断是否为可恢复的协议错误
function isRecoverableProtocolError(err) {
  return err instanceof ProtocolError || err?.isRecoverable === true;
}

function PanelRoot(props) {
  const [apps, setApps] = useState();
  const [appError, setAppError] = useState();
  // 新增：页面导航状态
  const [isNavigating, setIsNavigating] = useState(false);
  // 新增：用于触发重新加载的 key
  const [reloadKey, setReloadKey] = useState(0);
  // 用于跟踪组件是否已挂载
  const isMountedRef = useRef(true);

  if (appError) {
    throw appError;
  }

  // 手动重载函数
  const handleManualReload = useCallback(() => {
    setApps(undefined);
    setIsNavigating(false);
    setReloadKey(k => k + 1);
  }, []);

  // 获取应用列表（带有错误恢复处理）
  const fetchApps = useCallback(async () => {
    try {
      const results = await evalDevtoolsCmd(`exposedMethods?.getRawAppData()`);
      if (isMountedRef.current && results) {
        setApps(results);
        setIsNavigating(false);
      }
    } catch (err) {
      // 对于可恢复的协议错误，不抛出，只记录并等待
      if (isRecoverableProtocolError(err)) {
        console.debug("[single-spa-inspector] Recoverable error during getApps:", err.message);
        // 可能是页面导航中，设置导航状态
        if (isMountedRef.current) {
          setIsNavigating(true);
        }
        return;
      }
      err.message = `Error during getApps: ${err.message}`;
      if (isMountedRef.current) {
        setAppError(err);
      }
    }
  }, []);

  // 初始化时获取应用列表
  useEffect(() => {
    isMountedRef.current = true;
    fetchApps();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchApps, reloadKey]);

  // 带重试的获取应用列表
  const fetchAppsWithRetry = useCallback(async (maxRetries = 5, interval = 1500) => {
    for (let i = 0; i < maxRetries; i++) {
      if (!isMountedRef.current) return;
      
      try {
        const results = await evalDevtoolsCmd(`exposedMethods?.getRawAppData()`);
        if (isMountedRef.current && results) {
          setApps(results);
          setIsNavigating(false);
          console.log(`[single-spa-inspector] Apps loaded successfully on attempt ${i + 1}`);
          return;
        }
      } catch (err) {
        console.debug(`[single-spa-inspector] Attempt ${i + 1}/${maxRetries} failed:`, err.message);
      }
      
      // 等待一段时间再重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 所有重试都失败了，清除导航状态让用户可以手动重试
    if (isMountedRef.current) {
      setIsNavigating(false);
      console.warn("[single-spa-inspector] All retry attempts failed, waiting for manual reload");
    }
  }, []);

  // 监听页面导航事件
  useEffect(() => {
    function onNavigated(url) {
      console.log("[single-spa-inspector] Page navigated to:", url);
      if (isMountedRef.current) {
        // 不清除 apps 状态，保持界面稳定，避免闪烁
        // 只在后台静默重试获取新的应用列表
        // 如果已有 apps 数据，则静默刷新；如果没有，则显示 navigating 状态
        if (!apps) {
          setIsNavigating(true);
        }
        // 延迟后开始重试获取应用列表
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchAppsWithRetry();
          }
        }, 800);
      }
    }

    // 监听 devtools 导航事件
    if (browser.devtools?.network?.onNavigated) {
      browser.devtools.network.onNavigated.addListener(onNavigated);
      return () => {
        browser.devtools.network.onNavigated.removeListener(onNavigated);
      };
    }
  }, [fetchAppsWithRetry, apps]);

  useEffect(() => {
    document.body.classList.add(props.theme);
    return () => {
      document.body.classList.remove(props.theme);
    };
  }, [props.theme]);

  useEffect(() => {
    const boundEvtListener = contentScriptListener.bind(null, setApps, setIsNavigating);
    window.addEventListener("ext-content-script", boundEvtListener);

    return () => {
      window.removeEventListener("ext-content-script", boundEvtListener);
    };
  }, []);

  // 加载中或导航中状态
  if (!apps) {
    return (
      <div style={{ padding: "16px" }}>
        {isNavigating ? (
          <>
            <p style={{ color: "#e67e22" }}>
              <strong>⏳ Page is navigating...</strong>
            </p>
            <p>
              The inspected page is loading. Auto-retrying to connect...
            </p>
            <p style={{ color: "#82889a", fontSize: "12px" }}>
              If this takes too long, click the button below to manually reload.
            </p>
          </>
        ) : (
          <p>
            Loading... if you see this message for a long time, either single-spa is
            not on the page or you are not running a version of single-spa that
            supports developer tools
          </p>
        )}
        <button
          onClick={handleManualReload}
          style={{
            backgroundColor: "#3366ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "12px",
          }}
        >
          Reload single-spa Inspector Pro
        </button>
      </div>
    );
  }

  return (
    <>
      <Tabs>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TabList>
            <Tab>Applications</Tab>
            <Tab>Profiler</Tab>
          </TabList>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleManualReload}
              title="Reload Inspector"
              style={{
                backgroundColor: "#3366ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Reload single-spa Inspector Pro
            </button>
            <span style={{ color: '#82889a', fontSize: '0.75rem', paddingRight: '8px' }}>
              v{browser.runtime.getManifest().version}
            </span>
          </div>
        </div>

        <TabPanels>
          <TabPanel>
            <Apps apps={apps} theme={props.theme} />
          </TabPanel>
          <TabPanel>
            <Profiler />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}

async function getApps(setAppsFn) {
  try {
    const results = await evalDevtoolsCmd(`exposedMethods?.getRawAppData()`);
    if (results) {
      setAppsFn(results);
    }
  } catch (err) {
      // 对于可恢复的协议错误，不抛出
      if (isRecoverableProtocolError(err)) {
        console.debug("[single-spa-inspector] Recoverable error in getApps:", err.message);
      return;
    }
    throw err;
  }
}

function contentScriptListener(setApps, setIsNavigating, msg) {
  if (msg.detail.from === "single-spa" && msg.detail.type === "routing-event") {
    getApps(setApps).catch((err) => {
      // 对于可恢复的协议错误，设置导航状态
      if (isRecoverableProtocolError(err)) {
        console.debug("[single-spa-inspector] Recoverable error after routing event:", err.message);
        setIsNavigating(true);
        return;
      }
      console.error("error in getting apps after update event");
      throw err;
    });
  }
}

//themeName may or may not work in chrome. yet to test it to see whether it does or not
ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary>
      <PanelRoot theme={browser.devtools.panels.themeName} />
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById("app")
);
