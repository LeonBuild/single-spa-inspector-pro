import React, { useState, useEffect, useMemo } from "react";
import { Scoped, always } from "kremling";
import AppStatusOverride from "./app-status-override.component";
import Button from "./button";
import ToggleSwitch from "./toggle-switch";
import ClearCacheButton from "./clear-cache-button";
import { evalDevtoolsCmd } from "../inspected-window.helper.js";
import useImportMapOverrides from "./useImportMapOverrides";
import ToggleGroup from "./toggle-group";
import ToggleOption from "./toggle-option";

const OFF = "off",
  ON = "on",
  LIST = "list",
  PAGE = "page";

export default function Apps(props) {
  const sortedApps = useMemo(() => sortApps(props.apps), [props.apps]);
  const importMaps = useImportMapOverrides();
  const { mounted: mountedApps, other: otherApps } = useMemo(
    () => groupApps(props.apps),
    [props.apps]
  );
  const [hovered, setHovered] = useState();
  const [overlaysEnabled, setOverlaysEnabled] = useState(OFF);

  // 编辑状态管理：记录哪些 app 正在编辑
  const [editingApps, setEditingApps] = useState({});
  // 编辑中的临时值
  const [editValues, setEditValues] = useState({});
  // Reset All 确认状态
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (overlaysEnabled === LIST && hovered) {
      overlayApp(hovered);
      return () => {
        deOverlayApp(hovered);
      };
    }
  }, [overlaysEnabled, hovered]);

  useEffect(() => {
    if (overlaysEnabled === ON) {
      mountedApps.forEach((app) => overlayApp(app));
      otherApps.forEach((app) => deOverlayApp(app));
      return () => {
        mountedApps.forEach((app) => deOverlayApp(app));
      };
    }
  }, [overlaysEnabled, mountedApps, otherApps]);

  // 开始编辑
  const startEdit = (appName) => {
    setEditingApps({ ...editingApps, [appName]: true });
    setEditValues({
      ...editValues,
      [appName]: importMaps.savedOverrides[appName]?.url || ""
    });
  };

  // 取消编辑
  const cancelEdit = (appName) => {
    setEditingApps({ ...editingApps, [appName]: false });
    setEditValues({ ...editValues, [appName]: "" });
  };

  // 保存并刷新
  const handleSaveAndRefresh = async (appName) => {
    const url = editValues[appName];
    if (url && url.trim()) {
      // 有 URL，保存并启用
      await importMaps.saveOverride(appName, url.trim());
    } else {
      // 空 URL，清空地址并关闭 toggle
      await importMaps.clearSavedOverride(appName);
    }
    setEditingApps({ ...editingApps, [appName]: false });
  };

  // Toggle 切换
  const handleToggle = async (appName, enabled) => {
    await importMaps.toggleOverride(appName, enabled);
  };

  // 获取显示的 URL 值
  const getDisplayUrl = (appName) => {
    if (editingApps[appName]) {
      return editValues[appName] || "";
    }
    return importMaps.savedOverrides[appName]?.url || "";
  };

  // 判断 toggle 是否启用
  const isToggleEnabled = (appName) => {
    return importMaps.savedOverrides[appName]?.enabled || false;
  };

  // 判断是否有保存的 URL
  const hasSavedUrl = (appName) => {
    return !!importMaps.savedOverrides[appName]?.url;
  };

  // 验证 URL 是否以 .js 结尾
  const isValidJsUrl = (url) => {
    if (!url || !url.trim()) return true; // 空值不显示错误
    return url.trim().toLowerCase().endsWith('.js');
  };

  return (
    <Scoped css={css}>
      <span>
        <div className="toolbar">
          <ClearCacheButton />
          <ToggleGroup
            name="overlaysDisplayOption"
            value={overlaysEnabled}
            onChange={(e) => setOverlaysEnabled(e.target.value)}
          >
            <legend style={{ display: "inline" }}>Overlays</legend>
            <ToggleOption value={OFF}>Off</ToggleOption>
            <ToggleOption value={ON}>On</ToggleOption>
            <ToggleOption value={LIST}>List Hover</ToggleOption>
          </ToggleGroup>
        </div>
        <div role="table" className={"table"}>
          <div role="row">
            <span role="columnheader">App Name</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Actions</span>
            {importMaps.enabled && (
              <span role="columnheader" className="import-override-header">
                Import Override
                {showResetConfirm ? (
                  <span className="reset-confirm">
                    <span className="reset-confirm-text">Delete all saved overrides and refresh?</span>
                    <Button 
                      className="reset-confirm-btn"
                      onClick={() => {
                        importMaps.clearAllOverrides();
                        setShowResetConfirm(false);
                      }}
                    >
                      Confirm
                    </Button>
                    <Button 
                      className="reset-cancel-btn"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button 
                    className="reset-all-btn"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    Reset All
                  </Button>
                )}
              </span>
            )}
          </div>
          {sortedApps.map((app) => (
            <div
              role="row"
              key={app.name}
              onMouseEnter={() => setHovered(app)}
              onMouseLeave={() => setHovered()}
            >
              <div role="cell" className="app-name">{app.name}</div>
              <div role="cell">
                <span
                  className={always("app-status")
                    .maybe("app-mounted", app.status === "MOUNTED")
                    .maybe("app-not-mounted", app.status !== "MOUNTED")}
                >
                  {app.status.replace("_", " ")}
                </span>
              </div>
              <div role="cell">
                <AppStatusOverride app={app} />
              </div>
              {importMaps.enabled && (
                <div role="cell" className="import-override-cell">
                  {/* Toggle 开关 */}
                  <div className="toggle-wrapper">
                    <ToggleSwitch
                      checked={isToggleEnabled(app.name)}
                      onChange={(enabled) => handleToggle(app.name, enabled)}
                      disabled={!hasSavedUrl(app.name)}
                    />
                  </div>
                  
                  {/* Input 容器 */}
                  <div className="input-container">
                    <div className="input-wrapper">
                      <input
                        className={always("import-override")
                          .maybe("editing", editingApps[app.name])
                          .maybe("invalid", editingApps[app.name] && !isValidJsUrl(editValues[app.name]))}
                        value={getDisplayUrl(app.name)}
                        readOnly={!editingApps[app.name]}
                        onChange={(e) => {
                          setEditValues({ ...editValues, [app.name]: e.target.value });
                        }}
                        onClick={() => {
                          // 当 input 为空时，点击 input 进入 edit 模式
                          if (!editingApps[app.name] && !getDisplayUrl(app.name)) {
                            startEdit(app.name);
                          }
                        }}
                        onKeyDown={(e) => {
                          // 在编辑模式下按 Enter 键触发保存
                          if (e.key === "Enter" && editingApps[app.name]) {
                            e.preventDefault();
                            handleSaveAndRefresh(app.name);
                          }
                        }}
                        placeholder="Enter override URL..."
                      />
                      {/* Clear 按钮 - 仅在 edit 模式且有内容时显示 */}
                      {editingApps[app.name] && editValues[app.name] && (
                        <button
                          className="input-clear-btn"
                          onClick={() => setEditValues({ ...editValues, [app.name]: "" })}
                          type="button"
                          title="Clear"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {/* 验证提示 - 仅在 edit 模式且 URL 不以 .js 结尾时显示 */}
                    {editingApps[app.name] && !isValidJsUrl(editValues[app.name]) && (
                      <span className="url-warning">URL of an APP must end with .js</span>
                    )}
                  </div>
                  
                  {/* 按钮容器 - 固定宽度防止 UI 跳动 */}
                  <div className="override-buttons">
                    {editingApps[app.name] ? (
                      <>
                        <Button onClick={() => handleSaveAndRefresh(app.name)}>
                          Save
                        </Button>
                        <Button onClick={() => cancelEdit(app.name)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => startEdit(app.name)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </span>
    </Scoped>
  );
}

function sortApps(apps) {
  return [...apps]
    .sort((a, b) => {
      const nameA = a.name.toUpperCase(); // ignore upper and lowercase
      const nameB = b.name.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      // names must be equal
      return 0;
    })
    .sort((a, b) => {
      const statusA = a.status === "MOUNTED" || !!a.devtools.activeWhenForced;
      const statusB = b.status === "MOUNTED" || !!b.devtools.activeWhenForced;
      return statusB - statusA;
    });
}

function groupApps(apps) {
  const [mounted, other] = apps.reduce(
    (list, app) => {
      const group =
        app.status === "MOUNTED" || !!app.devtools.activeWhenForced ? 0 : 1;
      list[group].push(app);
      return list;
    },
    [[], []]
  );
  mounted.sort((a, b) => a.name.localeCompare(b.name));
  other.sort((a, b) => a.name.localeCompare(b.name));
  return {
    mounted,
    other,
  };
}

function overlayApp(app) {
  if (
    app.status !== "SKIP_BECAUSE_BROKEN" &&
    app.status !== "NOT_LOADED" &&
    app.devtools &&
    app.devtools.overlays
  ) {
    evalDevtoolsCmd(`overlay('${app.name}')`).catch((err) => {
      console.error(`Error overlaying applicaton: ${app.name}`, err);
    });
  }
}

function deOverlayApp(app) {
  if (app.devtools && app.devtools.overlays) {
    evalDevtoolsCmd(`removeOverlay('${app.name}')`).catch((err) => {
      console.error(`Error removing overlay on applicaton: ${app.name}`, err);
    });
  }
}

const css = `
:root {
  --gray: #82889a;
  --blue-light: #96b0ff;
  --blue: #3366ff;
  --blue-dark: #2850c8;
  --pink: #e62e5c;
  --green: #28cb51;
  --table-spacing: .5rem;
  --text-primary: #1a1a1a;
  --text-secondary: #82889a;
  --bg-tab: #f0f0f0;
}
body {
  font-family: sans-serif;
  color: var(--text-primary);
}

body.dark {
  --text-primary: #F8F8F2;
  --text-secondary: #a0a0a0;
  --bg-tab: #3c3c3c;
  background-color: #272822;
}

/* Tab 样式 - 自动适配黑白主题 */
[data-reach-tab-list] {
  background: var(--bg-tab);
}

[data-reach-tab] {
  color: var(--text-primary);
  font-weight: 500;
}

[data-reach-tab][data-selected] {
  border-bottom-color: var(--blue);
}

/* App Name 样式 - 加粗加重 */
& .app-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1a1a1a;
}

body.dark & .app-name {
  color: #ffffff;
}

& .toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
  padding: 4px var(--table-spacing);
  margin-bottom: 0;
}

& [role="table"] {
  display: table;
  border-collapse: separate;
  border-spacing: calc(var(--table-spacing) * 2) 2px;
  padding: 0;
  margin-left: calc(var(--table-spacing) - var(--table-spacing) * 2);
}

& [role="columnheader"] {
  color: var(--gray);
  font-size: .9rem;
  padding-left: .25rem;
  text-align: left;
  white-space: nowrap;
}

& [role="row"] {
  display: table-row;
}

& [role="row"] [role="cell"],
& [role="row"] [role="columnheader"] {
  display: table-cell;
  vertical-align: top;
  white-space: nowrap;
  padding-top: 2px;
}

& .app-status {
  border-radius: 1rem;
  color: #fff;
  font-size: .75rem;
  padding: .25rem .5rem .125rem;
  text-shadow: 0px 2px 4px rgba(0,0,0,.15);
  text-transform: capitalize;
}

& .app-mounted {
  background-color: var(--green);
}

& .app-not-mounted {
  background-color: var(--pink);
}

& .import-override-cell {
  display: inline-flex !important;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

& .toggle-wrapper {
  flex-shrink: 0;
}

& .input-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

& .input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

& .url-warning {
  color: var(--pink);
  font-size: .65rem;
  white-space: nowrap;
}

& .import-override.invalid {
  border-color: var(--pink);
}

& .input-clear-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: none;
  background: #999;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

& .input-clear-btn:hover {
  background: #666;
}

& .override-buttons {
  display: inline-flex;
  gap: 4px;
  width: 130px;
  flex-shrink: 0;
  justify-content: flex-start;
  align-self: flex-start;
}

& .override-buttons .button {
  min-width: 60px;
  text-align: center;
}

& .import-override {
  border: 1.5px solid lightgrey;
  border-radius: 3px;
  box-sizing: border-box;
  font-size: .75rem;
  padding: .2rem;
  padding-right: 22px;
  transition: all .15s ease-in-out;
  width: 210px;
}

& .import-override:read-only {
  background-color: #f5f5f5;
  cursor: default;
}

& .import-override.editing {
  background-color: #fff;
  border-color: var(--blue);
}

& .import-override:focus {
  border-color: var(--blue);
  outline: none;
}

& .import-override-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

& .reset-all-btn {
  background-color: var(--pink);
  color: #fff;
  font-size: .7rem;
  padding: .2rem .5rem;
}

& .reset-all-btn:hover {
  background-color: #c4264f;
}

& .reset-confirm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

& .reset-confirm-text {
  color: var(--pink);
  font-size: .75rem;
  font-weight: normal;
}

& .reset-confirm-btn {
  background-color: var(--pink);
  color: #fff;
  font-size: .7rem;
  padding: .2rem .5rem;
}

& .reset-confirm-btn:hover {
  background-color: #c4264f;
}

& .reset-cancel-btn {
  background-color: var(--gray);
  color: #fff;
  font-size: .7rem;
  padding: .2rem .5rem;
}

& .reset-cancel-btn:hover {
  background-color: #6a6f7d;
}
`;
