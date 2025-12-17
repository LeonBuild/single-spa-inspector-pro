import { useState, useEffect, useCallback } from "react";
import { evalCmd } from "../inspected-window.helper.js";
import browser from "webextension-polyfill";

export default function useImportMapOverrides() {
  const [importMapsEnabled, setImportMapEnabled] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [savedOverrides, setSavedOverrides] = useState({});
  const [appError, setAppError] = useState();

  if (appError) {
    throw appError;
  }

  // ========== 原有方法 ==========

  async function checkImportMapOverrides() {
    try {
      const hasImportMapsEnabled = await evalCmd(`(function() {
        return !!window.importMapOverrides
      })()`);
      return hasImportMapsEnabled;
    } catch (err) {
      err.message = `Error during hasImporMapsEnabled. ${err.message}`;
      setAppError(err);
    }
  }

  async function getImportMapOverrides() {
    try {
      const { imports } = await evalCmd(`(function() {
        return window.importMapOverrides.getOverrideMap()
      })()`);
      setOverrides(imports);
    } catch (err) {
      err.message = `Error during getImportMapOverrides. ${err.message}`;
      setAppError(err);
    }
  }

  async function addOverride(currentMap, currentUrl) {
    try {
      await evalCmd(`(function() {
        return window.importMapOverrides.addOverride("${currentMap}", "${currentUrl}")
      })()`);
    } catch (err) {
      err.message = `Error during addOverride. ${err.message}`;
      setAppError(err);
    }
  }

  async function removeOverride(currentMap) {
    try {
      await evalCmd(`(function() {
        return window.importMapOverrides.removeOverride("${currentMap}")
      })()`);
    } catch (err) {
      err.message = `Error during removeOverride. ${err.message}`;
      setAppError(err);
    }
  }

  async function batchSetOverrides() {
    try {
      const overrideCalls = Object.entries(overrides).map(([map, url]) =>
        !url ? removeOverride(map) : addOverride(map, url)
      );
      await Promise.all(overrideCalls);
      await evalCmd(`window.location.reload()`);
    } catch (err) {
      err.message = `Error during batchSetOverrides. ${err.message}`;
      setAppError(err);
    }
  }

  // ========== 新增方法: Storage 操作 ==========

  // 从 browser.storage.local 加载已保存的 overrides
  const loadSavedOverrides = useCallback(async () => {
    try {
      const result = await browser.storage.local.get("savedOverrides");
      if (result.savedOverrides) {
        setSavedOverrides(result.savedOverrides);
        return result.savedOverrides;
      }
      return {};
    } catch (err) {
      err.message = `Error loading saved overrides: ${err.message}`;
      setAppError(err);
      return {};
    }
  }, []);

  // 保存单个 override 到 storage，并应用到页面
  const saveOverride = useCallback(async (appName, url) => {
    try {
      const newSavedOverrides = {
        ...savedOverrides,
        [appName]: { url, enabled: true }
      };
      await browser.storage.local.set({ savedOverrides: newSavedOverrides });
      setSavedOverrides(newSavedOverrides);
      
      // 应用到页面
      await addOverride(appName, url);
      await evalCmd(`window.location.reload()`);
    } catch (err) {
      err.message = `Error saving override: ${err.message}`;
      setAppError(err);
    }
  }, [savedOverrides]);

  // 切换单个 override 的启用状态
  const toggleOverride = useCallback(async (appName, enabled) => {
    try {
      const saved = savedOverrides[appName];
      if (!saved) return;

      // 更新 storage 中的 enabled 状态
      const newSavedOverrides = {
        ...savedOverrides,
        [appName]: { ...saved, enabled }
      };
      await browser.storage.local.set({ savedOverrides: newSavedOverrides });
      setSavedOverrides(newSavedOverrides);

      // 应用或移除 override
      if (enabled) {
        await addOverride(appName, saved.url);
      } else {
        await removeOverride(appName);
      }
      await evalCmd(`window.location.reload()`);
    } catch (err) {
      err.message = `Error toggling override: ${err.message}`;
      setAppError(err);
    }
  }, [savedOverrides]);

  // 清除已保存的 override
  const clearSavedOverride = useCallback(async (appName) => {
    try {
      const newSavedOverrides = { ...savedOverrides };
      delete newSavedOverrides[appName];
      await browser.storage.local.set({ savedOverrides: newSavedOverrides });
      setSavedOverrides(newSavedOverrides);
      
      // 同时移除页面上的 override
      await removeOverride(appName);
    } catch (err) {
      err.message = `Error clearing saved override: ${err.message}`;
      setAppError(err);
    }
  }, [savedOverrides]);

  // ========== 初始化 ==========

  // 初始化时加载 importMapOverrides 和已保存的配置
  useEffect(() => {
    async function initImportMapsOverrides() {
      const hasImportMapsEnabled = await checkImportMapOverrides();
      if (hasImportMapsEnabled) {
        setImportMapEnabled(hasImportMapsEnabled);
        await getImportMapOverrides();
        await loadSavedOverrides();
      }
    }

    try {
      initImportMapsOverrides();
    } catch (err) {
      err.message = `Error during initImportMapsOverrides. ${err.message}`;
      setAppError(err);
    }
  }, []);

  // ========== 原有方法 ==========

  const setOverride = (mapping, url) => {
    const newOverrides = {
      ...overrides,
      [mapping]: url,
    };
    setOverrides(newOverrides);
  };

  // ========== 返回值 ==========

  return {
    enabled: importMapsEnabled,
    overrides,
    savedOverrides,
    setOverride,
    saveOverride,
    toggleOverride,
    clearSavedOverride,
    commitOverrides: batchSetOverrides,
  };
}
