var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
let globalStyleCacheVersion = 0;
function getGlobalStyleCacheVersion() {
  return globalStyleCacheVersion;
}
function markGlobalStyleCacheDirty() {
  globalStyleCacheVersion += 1;
  return globalStyleCacheVersion;
}
let AllKeyFramesMap = /* @__PURE__ */ new Map();
let keyframesCacheVersion = -1;
function gatherKeyFrame_MAP() {
  const styleVersion = getGlobalStyleCacheVersion();
  if (keyframesCacheVersion === styleVersion) {
    return AllKeyFramesMap;
  }
  AllKeyFramesMap.clear();
  const KEYFRAMES_TYPES = /* @__PURE__ */ new Set();
  if (typeof CSSRule !== "undefined") {
    if ("KEYFRAMES_RULE" in CSSRule) KEYFRAMES_TYPES.add(CSSRule.KEYFRAMES_RULE);
    if ("WEBKIT_KEYFRAMES_RULE" in CSSRule) KEYFRAMES_TYPES.add(CSSRule.WEBKIT_KEYFRAMES_RULE);
  }
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (KEYFRAMES_TYPES.has(rule.type)) {
        AllKeyFramesMap.set(rule.name, rule);
      }
    }
  }
  keyframesCacheVersion = styleVersion;
  return AllKeyFramesMap;
}
function getAnimationMap(AnimName) {
  if (!AnimName) return void 0;
  gatherKeyFrame_MAP();
  return AllKeyFramesMap.get(AnimName);
}
let classMap = null;
function buildClassMap() {
  classMap = Object.getOwnPropertyNames(THREE).filter((key) => {
    const C = THREE[key];
    return typeof C === "function" && C.prototype instanceof THREE.Object3D;
  }).reduce((m, key) => {
    m[key.toUpperCase()] = THREE[key];
    return m;
  }, /* @__PURE__ */ Object.create(null));
  classMap.OBJECT3D = THREE.Object3D;
}
function getClassMap() {
  if (!classMap) buildClassMap();
  return classMap;
}
const assetMap = /* @__PURE__ */ new Map();
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const audioLoader = new THREE.AudioLoader();
const mtlLoader = new MTLLoader();
const objLoader = new OBJLoader();
const pendingStylesheetAssetParses = /* @__PURE__ */ new Set();
function trackStylesheetParse(promise) {
  if (!promise || typeof promise.then !== "function") return;
  pendingStylesheetAssetParses.add(promise);
  promise.finally(() => {
    pendingStylesheetAssetParses.delete(promise);
  });
}
function getUrlBasePath(url) {
  const slash = url.lastIndexOf("/");
  return slash >= 0 ? url.slice(0, slash + 1) : "";
}
function storeAssetValue(key, value) {
  if (value && typeof value.then === "function") {
    const pending = value.then((resolved) => {
      assetMap.set(key, resolved);
      return resolved;
    }).catch((err) => {
      console.error(`Failed to load asset "${key}":`, err);
      assetMap.delete(key);
      return null;
    });
    assetMap.set(key, pending);
  } else {
    assetMap.set(key, value);
  }
}
function parseAssetRulesFromText(cssText) {
  if (!cssText || typeof cssText !== "string") return [];
  const ignoreAtRules = /* @__PURE__ */ new Set([
    "media",
    "import",
    "supports",
    "keyframes",
    "font-face",
    "charset",
    "namespace",
    "page",
    "counter-style",
    "font-feature-values",
    "viewport"
  ]);
  const assets = [];
  const atRuleRegex = /@([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\}/g;
  let match;
  while ((match = atRuleRegex.exec(cssText)) !== null) {
    const atName = match[1];
    if (ignoreAtRules.has(atName.toLowerCase())) continue;
    const body = match[2] || "";
    const obj = {};
    body.split(";").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim().toLowerCase();
      const rawValue = line.slice(idx + 1).trim();
      if (!key || !rawValue) return;
      obj[key] = rawValue.replace(/^['"(]+|['")]+$/g, "");
    });
    const url = "." + obj.url;
    if (!url) continue;
    const name = obj.name && obj.name.trim() ? obj.name.trim() : atName;
    assets.push({ name, url });
  }
  return assets;
}
function registerParsedAssetRuleEntries(entries) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!(entry == null ? void 0 : entry.name) || !(entry == null ? void 0 : entry.url)) continue;
    if (!assetMap.has(entry.name)) {
      storeAssetValue(entry.name, loadAsset(entry.url));
    }
  }
}
function gatherAssetRules() {
  const styleVersion = getGlobalStyleCacheVersion();
  if (gatherAssetRules._cacheVersion === styleVersion) {
    return;
  }
  const linkSheetsToParse = [];
  for (const sheet of document.styleSheets) {
    const owner = sheet.ownerNode;
    if ((owner == null ? void 0 : owner.nodeName) === "STYLE") {
      registerParsedAssetRuleEntries(parseAssetRulesFromText(owner.textContent || ""));
      continue;
    }
    if ((owner == null ? void 0 : owner.nodeName) === "LINK" && sheet.href) {
      linkSheetsToParse.push(sheet.href);
    }
  }
  const uniqueLinks = [...new Set(linkSheetsToParse)];
  if (!gatherAssetRules._linkFetchByVersion) {
    gatherAssetRules._linkFetchByVersion = /* @__PURE__ */ new Map();
  }
  const cacheKeyPrefix = `${styleVersion}|`;
  for (const key of [...gatherAssetRules._linkFetchByVersion.keys()]) {
    if (!key.startsWith(cacheKeyPrefix)) {
      gatherAssetRules._linkFetchByVersion.delete(key);
    }
  }
  if (uniqueLinks.length) {
    for (const href of uniqueLinks) {
      const fetchKey = `${styleVersion}|${href}`;
      if (gatherAssetRules._linkFetchByVersion.has(fetchKey)) continue;
      const parsePromise = fetch(href).then((resp) => resp.ok ? resp.text() : "").then((cssText) => {
        registerParsedAssetRuleEntries(parseAssetRulesFromText(cssText));
      }).catch((err) => {
        console.warn(`Failed to parse stylesheet text for asset rules: ${href}`, err);
      });
      gatherAssetRules._linkFetchByVersion.set(fetchKey, parsePromise);
      trackStylesheetParse(parsePromise);
    }
  }
  gatherAssetRules._cacheVersion = styleVersion;
}
function getAsset(name, path = null) {
  if (assetMap.size === 0) {
    storeAssetValue("cube", new THREE.BoxGeometry());
    storeAssetValue("sphere", new THREE.SphereGeometry());
    storeAssetValue("plane", new THREE.PlaneGeometry());
    storeAssetValue("torus", new THREE.TorusGeometry());
  }
  gatherAssetRules();
  const key = name;
  if (!assetMap.has(key)) {
    if (!path) {
      if (pendingStylesheetAssetParses.size > 0) {
        const pending = Promise.allSettled([...pendingStylesheetAssetParses]).then(() => {
          const resolved = assetMap.get(key);
          if (resolved !== void 0) return resolved;
          console.warn(`Asset "${name}" missing and no path supplied.`);
          return null;
        });
        return pending;
      }
      console.warn(`Asset "${name}" missing and no path supplied.`);
      return null;
    }
    storeAssetValue(key, loadAsset(path));
  }
  return assetMap.get(key);
}
function loadAsset(url) {
  const ext = (url.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "gltf":
    case "glb":
      return new Promise(
        (res, rej) => gltfLoader.load(url, (d) => res(d.scene || d), null, rej)
      );
    case "fbx":
      return new Promise(
        (res, rej) => fbxLoader.load(url, res, null, rej)
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return new Promise(
        (res, rej) => textureLoader.load(url, (tex) => res(tex), void 0, rej)
      );
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "aac":
      return new Promise(
        (res, rej) => audioLoader.load(url, (buffer) => res(buffer), void 0, rej)
      );
    case "mtl":
      return new Promise((res, rej) => {
        const basePath = getUrlBasePath(url);
        mtlLoader.setPath(basePath);
        mtlLoader.setResourcePath(basePath);
        mtlLoader.load(
          url,
          (mtl) => {
            mtl.preload();
            res(mtl);
          },
          void 0,
          rej
        );
      });
    case "obj":
      return new Promise((res, rej) => {
        getUrlBasePath(url);
        const mtlUrl = url.replace(/\.obj$/i, ".mtl");
        console.log(mtlUrl);
        mtlLoader.load(
          mtlUrl,
          (mtl) => {
            mtl.preload();
            objLoader.setMaterials(mtl);
            objLoader.load(url, res, null, rej);
          },
          void 0,
          () => {
            objLoader.load(url, res, null, rej);
          }
        );
      });
    case "json":
      return fetch(url).then((response) => response.json()).then((json) => {
        try {
          const loader = new THREE.MaterialLoader();
          return loader.parse(json);
        } catch (err) {
          console.warn(`MaterialLoader failed to parse ${url}:`, err);
          return json;
        }
      });
    default:
      console.warn(`No loader for ".${ext}".`);
      return Promise.resolve(null);
  }
}
function fastRemove_arry(arry, item) {
  const index = arry.indexOf(item);
  if (index !== -1) {
    arry[index] = arry[arry.length - 1];
    arry.pop();
  }
}
const fastRemoveArray = fastRemove_arry;
function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}
function lerpArray(from, to, t, lerpMethod) {
  const maxLen = Math.max(from.length, to.length);
  const out = new Array(maxLen);
  for (let i = 0; i < maxLen; i++) {
    const hasFrom = i < from.length;
    const hasTo = i < to.length;
    if (hasFrom && hasTo) {
      out[i] = lerpMethod(from[i], to[i], t);
    } else if (hasFrom) {
      out[i] = from[i];
    } else {
      out[i] = to[i];
    }
  }
  return out;
}
function lerpValue(from, to, t, lerpMethod = lerpNumber) {
  const isNum = (v) => typeof v === "number";
  const isArr = Array.isArray;
  if (isNum(from) && isNum(to)) {
    return lerpMethod(from, to, t);
  }
  if (isArr(from) && isArr(to)) {
    return lerpArray(from, to, t, lerpMethod);
  }
  return to;
}
function cubicBezier(p0, p1, p2, p3) {
  const cx = 3 * p0;
  const bx = 3 * (p2 - p0) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1;
  const by = 3 * (p3 - p1) - cy;
  const ay = 1 - cy - by;
  function sampleCurveX(t) {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleCurveY(t) {
    return ((ay * t + by) * t + cy) * t;
  }
  function sampleCurveDerivativeX(t) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }
  function solveTforX(x) {
    let t = x;
    for (let i = 0; i < 4; i++) {
      const dx = sampleCurveX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      t -= dx / sampleCurveDerivativeX(t);
    }
    return t;
  }
  return (x) => sampleCurveY(solveTforX(x));
}
function _get_Equation(timingFunction) {
  switch (timingFunction) {
    case "linear":
      return (t) => t;
    case "ease":
      return cubicBezier(0.25, 0.1, 0.25, 1);
    case "ease-in":
      return cubicBezier(0.42, 0, 1, 1);
    case "ease-out":
      return cubicBezier(0, 0, 0.58, 1);
    case "ease-in-out":
      return cubicBezier(0.42, 0, 0.58, 1);
  }
  if (typeof timingFunction === "string" && timingFunction.startsWith("cubic-bezier")) {
    const match = timingFunction.match(/cubic-bezier\(([^)]+)\)/);
    if (match) {
      const nums = match[1].split(/[, ]+/).map(Number).filter((n) => !Number.isNaN(n));
      if (nums.length === 4) {
        return cubicBezier(nums[0], nums[1], nums[2], nums[3]);
      }
    }
  }
  return (t) => t;
}
function animateLerp(from, to, durationMs, onUpdate, onComplete, timingFunction = "linear", signal = null) {
  const isAnimatable = (v) => typeof v === "number" || Array.isArray(v);
  let rafId = 0;
  let settled = false;
  const finish = (shouldComplete, value = to) => {
    if (settled) return;
    settled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (signal && onAbort) {
      signal.removeEventListener("abort", onAbort);
    }
    if (shouldComplete && onComplete) {
      onComplete(value);
    }
  };
  const finishInstant = () => {
    if (signal == null ? void 0 : signal.aborted) return;
    if (onUpdate) onUpdate(to, 1);
    finish(true, to);
  };
  const onAbort = () => {
    finish(false);
  };
  if (signal == null ? void 0 : signal.aborted) {
    return () => {
    };
  }
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
  }
  if (!isAnimatable(from) || !isAnimatable(to)) {
    finishInstant();
    return () => finish(false);
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    finishInstant();
    return () => finish(false);
  }
  const start = performance.now();
  const ease = _get_Equation(timingFunction);
  function step(now) {
    if (settled || (signal == null ? void 0 : signal.aborted)) {
      finish(false);
      return;
    }
    let t = (now - start) / durationMs;
    if (t >= 1) t = 1;
    const easedT = ease(t);
    const value = lerpValue(from, to, easedT, lerpNumber);
    if (onUpdate) onUpdate(value, easedT);
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      finish(true, value);
    }
  }
  rafId = requestAnimationFrame(step);
  return () => finish(false);
}
function parseKeyframeTime(keyText, totalDuration) {
  if (!keyText) return 0;
  const text = String(keyText).trim().toLowerCase();
  if (text === "from") return 0;
  if (text === "to") return totalDuration;
  if (text.endsWith("%")) {
    const v = parseFloat(text);
    return Number.isFinite(v) ? v / 100 * totalDuration : 0;
  }
  if (text.endsWith("ms")) {
    const v = parseFloat(text);
    return Number.isFinite(v) ? v : 0;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}
async function KeyFrameAnimationLerp(object, animationObj, signal = null) {
  var _a;
  if (!object || !(animationObj == null ? void 0 : animationObj.name) || !(animationObj == null ? void 0 : animationObj.duration)) return;
  if (signal == null ? void 0 : signal.aborted) return;
  const keyFramesRule = getAnimationMap(animationObj.name);
  if (!keyFramesRule || !keyFramesRule.cssRules) {
    console.error(`Animation "${animationObj.name}" not found or has no rules.`);
    return;
  }
  const duration = animationObj.duration;
  const rules = Array.from(keyFramesRule.cssRules).slice();
  rules.sort(
    (a, b) => parseKeyframeTime(a.keyText, duration) - parseKeyframeTime(b.keyText, duration)
  );
  const runOnce = async () => {
    for (let i = 0; i < rules.length - 1; i++) {
      if (signal == null ? void 0 : signal.aborted) return;
      const fromRule = rules[i];
      const toRule = rules[i + 1];
      const t0 = parseKeyframeTime(fromRule.keyText, duration);
      const t1 = parseKeyframeTime(toRule.keyText, duration);
      const segmentMs = t1 - t0;
      if (segmentMs <= 0) continue;
      const fromProps = {};
      const toProps = {};
      for (const propName of fromRule.style) {
        const raw = fromRule.style.getPropertyValue(propName);
        if (!propName.startsWith("--")) continue;
        fromProps[propName.slice(2)] = CSSValueTo3JSValue(raw, object);
      }
      for (const propName of toRule.style) {
        const raw = toRule.style.getPropertyValue(propName);
        if (!propName.startsWith("--")) continue;
        toProps[propName.slice(2)] = CSSValueTo3JSValue(raw, object);
      }
      const keys = Object.keys(fromProps).filter((k) => k in toProps);
      if (!keys.length) continue;
      await Promise.all(
        keys.map((key) => {
          if (signal == null ? void 0 : signal.aborted) return Promise.resolve();
          const fromVal = fromProps[key];
          const toVal = toProps[key];
          const resolveValue = (v) => v && typeof v.then === "function" ? v : Promise.resolve(v);
          return Promise.all([resolveValue(fromVal), resolveValue(toVal)]).then(([resolvedFrom, resolvedTo]) => new Promise((resolve) => {
            var _a2;
            if (signal == null ? void 0 : signal.aborted) {
              resolve();
              return;
            }
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              if (signal && onAbort) {
                signal.removeEventListener("abort", onAbort);
              }
              resolve();
            };
            const onAbort = () => finish();
            if (signal) {
              signal.addEventListener("abort", onAbort, { once: true });
            }
            animateLerp(
              resolvedFrom,
              resolvedTo,
              segmentMs,
              (v) => {
                if (signal == null ? void 0 : signal.aborted) return;
                const { parent, key: finalKey } = deep_searchParms(object, key.split("-"));
                exchange_rule(parent, finalKey, v);
              },
              finish,
              ((_a2 = animationObj.timing) == null ? void 0 : _a2.fun) || "linear",
              signal
            );
          }));
        })
      );
    }
  };
  let iterationCount = ((_a = animationObj.iteration) == null ? void 0 : _a.count) ?? 1;
  if (iterationCount === "infinity" || iterationCount === "infinite") {
    iterationCount = Infinity;
  }
  if (iterationCount === Infinity) {
    while (!(signal == null ? void 0 : signal.aborted)) {
      await runOnce();
    }
  } else {
    const total = Number(iterationCount) || 1;
    for (let i = 0; i < total; i++) {
      if (signal == null ? void 0 : signal.aborted) return;
      await runOnce();
    }
  }
}
let selectorRuleCache = /* @__PURE__ */ new Map();
let selectorRuleCacheVersion = -1;
let warnedLegacyNameClassFallback = false;
let asyncAssignmentSerial = 0;
function ensureSelectorRuleCache() {
  const version = getGlobalStyleCacheVersion();
  if (selectorRuleCacheVersion !== version) {
    selectorRuleCache.clear();
    selectorRuleCacheVersion = version;
  }
}
function getObjectClassSelectors(object) {
  const aliasList = object == null ? void 0 : object.classList;
  if (Array.isArray(aliasList)) return aliasList;
  if ((object == null ? void 0 : object.userData) && Object.prototype.hasOwnProperty.call(object.userData, "classList")) {
    return Array.isArray(object.userData.classList) ? object.userData.classList : [];
  }
  if (object == null ? void 0 : object.name) {
    if (!warnedLegacyNameClassFallback) {
      warnedLegacyNameClassFallback = true;
      console.warn(
        "JailedThreeJS: inferring CSS classes from Object3D.name is deprecated. Use object.classList/userData.classList."
      );
    }
    return [object.name];
  }
  return [];
}
function hasClassPseudoRule(object, pseudo) {
  return getObjectClassSelectors(object).some((cls) => getCSSRule(`.${cls}${pseudo}`));
}
function animationConfigKey(animCfg) {
  var _a, _b;
  if (!animCfg) return null;
  return [
    animCfg.name || "",
    animCfg.duration || 0,
    ((_a = animCfg.timing) == null ? void 0 : _a.fun) || "linear",
    ((_b = animCfg.iteration) == null ? void 0 : _b.count) ?? 1
  ].join("|");
}
function stopObjectAnimation(object) {
  var _a, _b;
  const ctrl = (_a = object == null ? void 0 : object.userData) == null ? void 0 : _a._animationAbortController;
  if (ctrl && typeof ctrl.abort === "function" && !((_b = ctrl.signal) == null ? void 0 : _b.aborted)) {
    ctrl.abort();
  }
  object.userData._animationAbortController = null;
  object.userData._animationRunning = false;
}
function coerceAssetToGeometryPayload(assetValue, rawProp) {
  var _a;
  if (!assetValue) return null;
  if (assetValue.isBufferGeometry) {
    return { geometry: assetValue, material: null };
  }
  if ((_a = assetValue.geometry) == null ? void 0 : _a.isBufferGeometry) {
    return {
      geometry: assetValue.geometry,
      material: assetValue.material ?? null
    };
  }
  if (assetValue.isObject3D && typeof assetValue.traverse === "function") {
    let foundMesh = null;
    assetValue.traverse((node) => {
      var _a2;
      if (!foundMesh && (node == null ? void 0 : node.isMesh) && ((_a2 = node.geometry) == null ? void 0 : _a2.isBufferGeometry)) {
        foundMesh = node;
      }
    });
    if (foundMesh) {
      return {
        geometry: foundMesh.geometry,
        material: foundMesh.material ?? null
      };
    }
  }
  console.error(`Asset resolved for "${rawProp}" is not a BufferGeometry.`);
  return null;
}
function cloneMaterialLike(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    return material.map((m) => (m == null ? void 0 : m.clone) ? m.clone() : m);
  }
  return material.clone ? material.clone() : material;
}
function parseAnimationCSS(value) {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (!lower || lower === "none") return null;
  const parts = lower.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const nameToken = parts.shift();
  if (!nameToken) return null;
  let durationMs = 1e3;
  let timingFun = "linear";
  let iterationCount = 1;
  if (parts.length) {
    const timeToken = parts[0];
    if (/\d/.test(timeToken)) {
      parts.shift();
      if (timeToken.endsWith("ms")) {
        durationMs = parseFloat(timeToken);
      } else if (timeToken.endsWith("s")) {
        durationMs = parseFloat(timeToken) * 1e3;
      } else {
        durationMs = parseFloat(timeToken);
      }
    }
  }
  const infIndex = parts.findIndex((t) => t === "infinite" || t === "infinity");
  if (infIndex !== -1) {
    iterationCount = "infinite";
    parts.splice(infIndex, 1);
  } else if (parts.length) {
    const maybeCount = parseInt(parts[parts.length - 1], 10);
    if (Number.isFinite(maybeCount) && maybeCount > 0) {
      iterationCount = maybeCount;
      parts.pop();
    }
  }
  if (parts.length) {
    timingFun = parts.join(" ");
  }
  return {
    name: nameToken,
    duration: durationMs,
    iteration: { count: iterationCount },
    timing: { fun: timingFun }
  };
}
function parseTransitionCSS(value) {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (!lower || lower === "none") return null;
  const parts = lower.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const timeToken = parts.shift();
  let durationMs;
  if (timeToken.endsWith("ms")) {
    durationMs = parseFloat(timeToken);
  } else if (timeToken.endsWith("s")) {
    durationMs = parseFloat(timeToken) * 1e3;
  } else {
    durationMs = parseFloat(timeToken);
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }
  const timingFun = parts.join(" ") || "linear";
  return {
    duration: durationMs,
    timing: { fun: timingFun }
  };
}
function getCSSRule(selector) {
  ensureSelectorRuleCache();
  if (selectorRuleCache.has(selector)) {
    return selectorRuleCache.get(selector) || void 0;
  }
  let found = null;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!rule.selectorText) continue;
      const selectors = rule.selectorText.split(",");
      for (const sel of selectors) {
        if (sel.trim().split(/\s+/).includes(selector)) {
          found = rule;
          break;
        }
      }
      if (found) break;
    }
    if (found) break;
  }
  selectorRuleCache.set(selector, found);
  return found || void 0;
}
function deep_searchParms(object, path) {
  const key = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((o, k) => {
    if (o[k] == null) o[k] = {};
    return o[k];
  }, object);
  return { parent, key };
}
function CSSValueTo3JSValue(value, __object = null) {
  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (typeof normalizedValue !== "string") return normalizedValue;
  let parsed;
  if (/^\(.+\)$/.test(normalizedValue)) {
    parsed = normalizedValue.slice(1, -1).split(",").map((v) => parseFloat(v.trim()));
  } else if (!Number.isNaN(parseFloat(normalizedValue))) {
    parsed = parseFloat(normalizedValue);
  } else {
    parsed = normalizedValue.replace(/^['"]|['"]$/g, "");
  }
  if (typeof parsed === "string") {
    console.log(parsed);
    const assetName = parsed;
    if (getAsset(assetName)) {
      return getAsset(assetName);
    }
    switch (parsed[0]) {
      case "#": {
        if (!__object) {
          console.error("CSSValueTo3JSValue: __object is null when resolving", parsed);
          return null;
        }
        try {
          const cellElement = __object.userData.domEl.closest("cell");
          const actualCellObject = Cell.getCell(cellElement);
          const path = parsed.split("-");
          if (path.length < 1) {
            throw new Error('Requesting empty paths using "#" is not allowed');
          }
          const targetObject = actualCellObject.getConvictById(path[0].slice(1));
          if (!targetObject) {
            throw new Error("Failed to find object with id " + parsed);
          }
          path.shift();
          const { parent, key } = deep_searchParms(targetObject, path);
          return parent[key];
        } catch (err) {
          console.error(err);
          return void 0;
        }
      }
    }
  }
  return parsed;
}
function exchange_rule(parent, key, value) {
  if (!parent) return;
  const target = parent[key];
  try {
    if (Array.isArray(value)) {
      if (target && typeof target.set === "function") {
        target.set(...value);
      } else if (typeof target === "function") {
        target(...value);
      } else {
        parent[key] = value;
      }
      return;
    }
    if (target && typeof target.set === "function") {
      target.set(value);
    } else if (typeof target === "function") {
      target(value);
    } else {
      parent[key] = value;
    }
  } catch (err) {
    console.warn(`Failed to assign ${key} with`, value, err);
  }
}
function _apply_rule(rule, object, _chosenOne = null) {
  if (!rule || !rule.style || !object) return;
  const domEl = object.userData.domEl;
  object.userData._lastCSS = object.userData._lastCSS || /* @__PURE__ */ Object.create(null);
  object.userData._pendingAsyncAssignments = object.userData._pendingAsyncAssignments || /* @__PURE__ */ Object.create(null);
  let sawAnimationDeclaration = false;
  if ((domEl == null ? void 0 : domEl.hasAttribute("onclick")) || (domEl == null ? void 0 : domEl.hasAttribute("onmouseover")) || (domEl == null ? void 0 : domEl.hasAttribute("ondblclick")) || (domEl == null ? void 0 : domEl.hasAttribute("onmousedown")) || (domEl == null ? void 0 : domEl.hasAttribute("onmouseup")) || (domEl == null ? void 0 : domEl.hasAttribute("oncontextmenu")) || hasClassPseudoRule(object, ":hover") || hasClassPseudoRule(object, ":focus") || object.userData.domId && getCSSRule(`#${object.userData.domId}:focus`) || object.userData.domId && getCSSRule(`#${object.userData.domId}:hover`)) {
    object.layers.enable(3);
  } else {
    object.layers.disable(3);
  }
  for (let i = 0; i < rule.style.length; i++) {
    const rawProp = rule.style[i];
    const value = rule.style.getPropertyValue(rawProp).trim();
    if (!rawProp.startsWith("--")) continue;
    if (rawProp === "--transition") {
      const cfg = parseTransitionCSS(value);
      object.transition = cfg;
      continue;
    }
    if (rawProp === "--animation") {
      sawAnimationDeclaration = true;
      const animCfg = parseAnimationCSS(value);
      const nextAnimKey = animationConfigKey(animCfg);
      if (object.userData._animationConfigKey !== nextAnimKey) {
        stopObjectAnimation(object);
        object.userData._animationConfigKey = nextAnimKey;
      }
      object.animation = animCfg;
      continue;
    }
    const prop = rawProp.slice(2);
    const path = prop.split("-");
    const parsed = CSSValueTo3JSValue(value, object);
    const { parent, key } = deep_searchParms(object, path);
    const referencedAssetName = value;
    const assignmentToken = ++asyncAssignmentSerial;
    object.userData._pendingAsyncAssignments[prop] = assignmentToken;
    const assignValue = (resolvedValue) => {
      var _a;
      if (object.userData._pendingAsyncAssignments[prop] !== assignmentToken) {
        return;
      }
      if (resolvedValue === void 0) return;
      if (referencedAssetName && resolvedValue == null) return;
      let finalValue = resolvedValue;
      if (referencedAssetName && key === "geometry") {
        const payload = coerceAssetToGeometryPayload(resolvedValue, rawProp);
        if (!payload) return;
        finalValue = payload.geometry;
        if (payload.material && parent && (Object.prototype.hasOwnProperty.call(parent, "material") || parent.isMesh)) {
          parent.material = cloneMaterialLike(payload.material);
        }
      }
      const transition = object.transition;
      const currentRaw = parent[key];
      const currentValue = currentRaw && typeof currentRaw.toArray === "function" ? currentRaw.toArray() : currentRaw;
      const duration = (transition == null ? void 0 : transition.duration) ?? 0;
      const timingFn = ((_a = transition == null ? void 0 : transition.timing) == null ? void 0 : _a.fun) ?? "linear";
      const isAnimatable = transition && duration > 0 && (typeof currentValue === "number" || Array.isArray(currentValue)) && (typeof finalValue === "number" || Array.isArray(finalValue));
      if (isAnimatable) {
        animateLerp(
          currentValue,
          finalValue,
          duration,
          (v) => exchange_rule(parent, key, v),
          () => {
            object.dispatchEvent({
              type: "TransitionFinished",
              target: object,
              detail: { selector: _chosenOne, to: parent }
            });
          },
          timingFn
        );
      } else {
        exchange_rule(parent, key, finalValue);
      }
    };
    if (parsed && typeof parsed.then === "function") {
      parsed.then(assignValue).catch(
        (err) => console.error("Failed to resolve asset for", rawProp, err)
      );
    } else {
      assignValue(parsed);
    }
  }
  if (sawAnimationDeclaration && !object.animation) {
    stopObjectAnimation(object);
  }
  if (object.animation) {
    if (!object.userData._animationRunning) {
      const controller = new AbortController();
      object.userData._animationRunning = true;
      object.userData._animationAbortController = controller;
      (async () => {
        try {
          await KeyFrameAnimationLerp(object, object.animation, controller.signal);
        } catch (err) {
          if (!controller.signal.aborted) {
            console.error(err);
          }
        } finally {
          if (object.userData._animationAbortController === controller) {
            object.userData._animationAbortController = null;
            object.userData._animationRunning = false;
          }
        }
      })();
    }
  }
}
function paintConvict(convictElm, cell) {
  gatherAssetRules();
  const convict = cell._allConvictsByDom.get(convictElm);
  if (convict) {
    _apply_rule(convictElm, convict);
  }
}
function paintExtraCell(muse) {
  for (const obj of muse.classyConvicts) {
    const classes = getObjectClassSelectors(obj);
    (obj.userData.extraParams || []).forEach((param) => {
      classes.forEach((cls) => {
        const rule = getCSSRule(`.${cls}${param}`);
        if (rule) _apply_rule(rule, obj);
      });
    });
  }
  for (const obj of muse.namedConvicts) {
    if (!obj.userData.domId) continue;
    (obj.userData.extraParams || []).forEach((param) => {
      const rule = getCSSRule(`#${obj.userData.domId}${param}`);
      if (rule) _apply_rule(rule, obj);
    });
  }
}
function paintCell(muse) {
  gatherAssetRules();
  for (const obj of muse.classyConvicts) {
    for (const cls of getObjectClassSelectors(obj)) {
      const rule = getCSSRule(`.${cls}`);
      if (rule) _apply_rule(rule, obj, `.${cls}`);
    }
  }
  for (const obj of muse.namedConvicts) {
    if (!obj.userData.domId) continue;
    const rule = getCSSRule(`#${obj.userData.domId}`);
    if (rule) _apply_rule(rule, obj, `#${obj.userData.domId}`);
  }
}
function paintSpecificMuse(muse) {
  var _a;
  gatherAssetRules();
  const extra = muse.userData.extraParams || [];
  getObjectClassSelectors(muse).forEach((cls) => {
    const rule = getCSSRule(`.${cls}`);
    if (rule) _apply_rule(rule, muse);
  });
  if (muse.userData.domId) {
    const baseIdRule = getCSSRule(`#${muse.userData.domId}`);
    if (baseIdRule) _apply_rule(baseIdRule, muse);
  }
  extra.forEach((param) => {
    getObjectClassSelectors(muse).forEach((cls) => {
      const clsRule = getCSSRule(`.${cls}${param}`);
      if (clsRule) _apply_rule(clsRule, muse);
    });
  });
  if (muse.userData.domId) {
    extra.forEach((param) => {
      const idRule = getCSSRule(`#${muse.userData.domId}${param}`);
      if (idRule) _apply_rule(idRule, muse);
    });
  }
  if ((_a = muse.userData.domEl) == null ? void 0 : _a.hasAttribute("style")) {
    _apply_rule(muse.userData.domEl, muse);
  }
}
function paintConstantMuse(muse) {
  getObjectClassSelectors(muse).forEach((cls) => {
    const rule = getCSSRule(`.${cls}:active`);
    if (rule) _apply_rule(rule, muse);
  });
  if (muse.userData.domId) {
    const rule = getCSSRule(`#${muse.userData.domId}:active`);
    if (rule) _apply_rule(rule, muse);
  }
}
const raycaster = new THREE.Raycaster();
const ndcPointer = new THREE.Vector2();
raycaster.layers.set(3);
function addFlag(arr, flag) {
  if (arr.includes(flag)) return false;
  arr.push(flag);
  return true;
}
function delFlag(arr, flag) {
  const hadFlag = arr.includes(flag);
  if (!hadFlag) return false;
  fastRemove_arry(arr, flag);
  return true;
}
function _flushPendingPointerMove(cell) {
  if (!(cell == null ? void 0 : cell._pointerMoveRaf) || !cell._pendingPointerMoveEvt) return;
  cancelAnimationFrame(cell._pointerMoveRaf);
  cell._pointerMoveRaf = 0;
  const evt = cell._pendingPointerMoveEvt;
  cell._pendingPointerMoveEvt = null;
  _processPointerMove(evt, cell);
}
function default_onCellClick_method(domEvt, cell) {
  var _a;
  _flushPendingPointerMove(cell);
  const hit = cell._last_cast_caught;
  if (!hit) return;
  const focusChanged = addFlag(hit.userData.extraParams, ":focus");
  const synth = {
    type: "cellclick",
    originalEvt: domEvt,
    target3d: hit,
    targetCell: cell,
    targetElement: hit.userData.domEl,
    pointerPosition: cell._lastHitPosition
  };
  (_a = hit.userData.domEl.onclick) == null ? void 0 : _a.call(hit.userData.domEl, synth);
  if (focusChanged) paintSpecificMuse(hit);
}
function default_onCellPointerMove_method(domEvt, cell) {
  if (!cell.focusedCamera) return;
  cell._pendingPointerMoveEvt = domEvt;
  if (cell._pointerMoveRaf) return;
  cell._pointerMoveRaf = requestAnimationFrame(() => {
    const evt = cell._pendingPointerMoveEvt;
    cell._pendingPointerMoveEvt = null;
    cell._pointerMoveRaf = 0;
    if (!evt || !cell._running) return;
    _processPointerMove(evt, cell);
  });
}
function _processPointerMove(domEvt, cell) {
  var _a, _b, _c, _d;
  _raycast(domEvt, cell.focusedCamera, cell.cellElm);
  const hitResult = raycaster.intersectObjects(cell.loadedScene.children, true)[0];
  const lastHit = cell._last_cast_caught;
  if (hitResult) {
    const hitObject = hitResult.object;
    let shouldRepaintCurrent = false;
    if (hitObject !== lastHit) {
      if (lastHit) {
        const hoverRemoved = delFlag(lastHit.userData.extraParams, ":hover");
        (_a = lastHit.userData.domEl.onmouseleave) == null ? void 0 : _a.call(lastHit.userData.domEl, {
          type: "cellmouseleave",
          originalEvt: domEvt,
          target3d: lastHit,
          targetCell: cell,
          targetElement: lastHit.userData.domEl,
          pointerPosition: cell._lastHitPosition
        });
        if (hoverRemoved) paintSpecificMuse(lastHit);
      }
      cell._last_cast_caught = hitObject;
      (_b = hitObject.userData.domEl.onmouseenter) == null ? void 0 : _b.call(hitObject.userData.domEl, {
        type: "cellmouseenter",
        originalEvt: domEvt,
        target3d: hitObject,
        targetCell: cell,
        targetElement: hitObject.userData.domEl,
        pointerPosition: hitResult.point
      });
      shouldRepaintCurrent = true;
    }
    if (addFlag(hitObject.userData.extraParams, ":hover")) {
      shouldRepaintCurrent = true;
    }
    cell._lastHitPosition = hitResult.point;
    (_c = hitObject.userData.domEl.onmouseover) == null ? void 0 : _c.call(hitObject.userData.domEl, {
      type: "cellhover",
      originalEvt: domEvt,
      target3d: hitObject,
      targetCell: cell,
      targetElement: hitObject.userData.domEl,
      pointerPosition: hitResult.point
    });
    if (shouldRepaintCurrent) paintSpecificMuse(hitObject);
  } else if (lastHit) {
    const hoverRemoved = delFlag(lastHit.userData.extraParams, ":hover");
    (_d = lastHit.userData.domEl.onmouseleave) == null ? void 0 : _d.call(lastHit.userData.domEl, {
      type: "cellmouseleave",
      originalEvt: domEvt,
      target3d: lastHit,
      targetCell: cell,
      targetElement: lastHit.userData.domEl,
      pointerPosition: cell._lastHitPosition
    });
    if (hoverRemoved) paintSpecificMuse(lastHit);
    cell._last_cast_caught = null;
  }
}
function default_onCellMouseDown_method(domEvt, cell) {
  var _a;
  _flushPendingPointerMove(cell);
  const hit = cell._last_cast_caught;
  if (!hit) return;
  const activeChanged = addFlag(hit.userData.extraParams, ":active");
  const synth = {
    type: "celldown",
    originalEvt: domEvt,
    target3d: hit,
    targetCell: cell,
    targetElement: hit.userData.domEl,
    pointerPosition: cell._lastHitPosition
  };
  (_a = hit.userData.domEl.onmousedown) == null ? void 0 : _a.call(hit.userData.domEl, synth);
  if (activeChanged) paintSpecificMuse(hit);
}
function default_onCellMouseUp_method(domEvt, cell) {
  var _a;
  _flushPendingPointerMove(cell);
  const hit = cell._last_cast_caught;
  if (!hit) return;
  const activeChanged = delFlag(hit.userData.extraParams, ":active");
  const synth = {
    type: "cellup",
    originalEvt: domEvt,
    target3d: hit,
    targetCell: cell,
    targetElement: hit.userData.domEl,
    pointerPosition: cell._lastHitPosition
  };
  (_a = hit.userData.domEl.onmouseup) == null ? void 0 : _a.call(hit.userData.domEl, synth);
  if (activeChanged) paintSpecificMuse(hit);
}
function default_onCellDoubleClick_method(domEvt, cell) {
  var _a;
  _flushPendingPointerMove(cell);
  const hit = cell._last_cast_caught;
  if (!hit) return;
  const focusChanged = addFlag(hit.userData.extraParams, ":focus");
  const synth = {
    type: "celldblclick",
    originalEvt: domEvt,
    target3d: hit,
    targetCell: cell,
    targetElement: hit.userData.domEl,
    pointerPosition: cell._lastHitPosition
  };
  (_a = hit.userData.domEl.ondblclick) == null ? void 0 : _a.call(hit.userData.domEl, synth);
  if (focusChanged) paintSpecificMuse(hit);
}
function default_onCellContextMenu_method(domEvt, cell) {
  var _a;
  _flushPendingPointerMove(cell);
  const hit = cell._last_cast_caught;
  if (!hit) return;
  const synth = {
    type: "cellcontextmenu",
    originalEvt: domEvt,
    target3d: hit,
    targetCell: cell,
    targetElement: hit.userData.domEl,
    pointerPosition: cell._lastHitPosition
  };
  (_a = hit.userData.domEl.oncontextmenu) == null ? void 0 : _a.call(hit.userData.domEl, synth);
}
function _raycast(domEvt, camera, referenceEl) {
  if (!camera) return;
  const targetEl = referenceEl || domEvt.currentTarget || domEvt.target;
  const rect = targetEl.getBoundingClientRect();
  camera.updateMatrixWorld();
  ndcPointer.set(
    (domEvt.clientX - rect.left) / rect.width * 2 - 1,
    -(domEvt.clientY - rect.top) / rect.height * 2 + 1
  );
  raycaster.setFromCamera(ndcPointer, camera);
}
const _Cell = class _Cell {
  /**
   * Retrieve an existing Cell for a <cell> element.
   *
   * @param {HTMLElement} element
   * @returns {Cell|null}
   */
  static getCell(element) {
    if (_Cell.allCells.has(element)) {
      return _Cell.allCells.get(element);
    }
    console.error("No Cell found with the element:", element);
    return null;
  }
  /**
   * @param {HTMLElement} cellElm
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera|null} [camera=null]
   * @param {Function|null} [_MainAnimMethod=null]
   */
  constructor(cellElm, renderer, scene, camera = null, _MainAnimMethod = null) {
    this.cellElm = cellElm;
    Object.defineProperty(cellElm, "cell", {
      value: this,
      enumerable: false
    });
    this.threeRenderer = renderer;
    this.loadedScene = scene;
    this.focusedCamera = camera;
    this.classyConvicts = /* @__PURE__ */ new Set();
    this.namedConvicts = /* @__PURE__ */ new Set();
    this._allConvictsByDom = /* @__PURE__ */ new WeakMap();
    this._convictsById = /* @__PURE__ */ new Map();
    this._convictsByClass = /* @__PURE__ */ new Map();
    this.updateFunds = [];
    this._observedStyleElements = /* @__PURE__ */ new WeakSet();
    this._pendingStyleRepaint = false;
    this._pointerMoveRaf = 0;
    this._pendingPointerMoveEvt = null;
    this._last_cast_caught = null;
    this._lastHitPosition = null;
    _Cell.allCells.set(cellElm, this);
    this._ScanCell();
    this._boundPointerMove = (evt) => {
      default_onCellPointerMove_method(evt, this);
    };
    this._boundClick = (evt) => {
      default_onCellClick_method(evt, this);
    };
    this._boundMouseDown = (evt) => {
      default_onCellMouseDown_method(evt, this);
    };
    this._boundMouseUp = (evt) => {
      default_onCellMouseUp_method(evt, this);
    };
    this._boundDoubleClick = (evt) => {
      default_onCellDoubleClick_method(evt, this);
    };
    this._boundContextMenu = (evt) => {
      evt.preventDefault();
      default_onCellContextMenu_method(evt, this);
    };
    cellElm.addEventListener("mousemove", this._boundPointerMove);
    cellElm.addEventListener("click", this._boundClick);
    cellElm.addEventListener("mousedown", this._boundMouseDown);
    cellElm.addEventListener("mouseup", this._boundMouseUp);
    cellElm.addEventListener("dblclick", this._boundDoubleClick);
    cellElm.addEventListener("contextmenu", this._boundContextMenu);
    gatherAssetRules();
    paintCell(this);
    this._styleElemObserver = new MutationObserver(() => {
      if (this._pendingStyleRepaint) return;
      markGlobalStyleCacheDirty();
      this._pendingStyleRepaint = true;
      requestAnimationFrame(() => {
        this._pendingStyleRepaint = false;
        gatherAssetRules();
        paintCell(this);
        this._repaintKnownConvicts();
      });
    });
    this._observeStyleElements = (root) => {
      if (!root) return;
      const targets = [];
      if (root.nodeName === "STYLE") {
        targets.push(root);
      } else if (typeof root.querySelectorAll === "function") {
        targets.push(...root.querySelectorAll("style"));
      }
      targets.forEach((styleEl) => {
        if (this._observedStyleElements.has(styleEl)) return;
        this._observedStyleElements.add(styleEl);
        this._styleElemObserver.observe(styleEl, {
          childList: true,
          characterData: true,
          subtree: true
        });
      });
    };
    this._styleHostObserver = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        let styleTreeChanged = false;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === "STYLE") {
            this._observeStyleElements(node);
            styleTreeChanged = true;
          } else if (node.nodeType === Node.ELEMENT_NODE && typeof node.querySelector === "function" && node.querySelector("style")) {
            this._observeStyleElements(node);
            styleTreeChanged = true;
          }
        });
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node.nodeName === "STYLE" || typeof node.querySelector === "function" && node.querySelector("style"))) {
            styleTreeChanged = true;
          }
        });
        if (styleTreeChanged) {
          markGlobalStyleCacheDirty();
          this._scheduleFullRepaint();
        }
      });
    });
    this._observeStyleElements(this.cellElm);
    if (document.head) {
      this._observeStyleElements(document.head);
      this._styleHostObserver.observe(document.head, {
        childList: true,
        subtree: true
      });
    }
    this._styleObserver = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        if (mutation.target.nodeName === "CANVAS") return;
        switch (mutation.type) {
          case "childList": {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "CANVAS") {
                if (node.nodeName === "STYLE") {
                  this._observeStyleElements(node);
                  markGlobalStyleCacheDirty();
                  this._scheduleFullRepaint();
                } else {
                  this.ScanElement(node);
                  const convict = this.getConvictByDom(node);
                  if (convict) {
                    paintSpecificMuse(convict);
                  }
                }
              }
            }
            for (let i = 0; i < mutation.removedNodes.length; i++) {
              const node = mutation.removedNodes[i];
              if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "CANVAS") {
                if (node.nodeName === "STYLE" || typeof node.querySelector === "function" && node.querySelector("style")) {
                  markGlobalStyleCacheDirty();
                  this._scheduleFullRepaint();
                }
                this.removeConvict(this._allConvictsByDom.get(node));
              }
            }
            break;
          }
          case "attributes": {
            const target = mutation.target;
            const convict = target.convict;
            if (!convict) break;
            if (mutation.attributeName === "id") {
              this._syncConvictIdentity(convict, target);
              paintSpecificMuse(convict);
            } else if (mutation.attributeName === "class") {
              this._syncConvictIdentity(convict, target);
              paintSpecificMuse(convict);
            } else if (mutation.attributeName === "style") {
              paintConvict(target, this);
            }
            break;
          }
        }
      });
    });
    this._styleObserver.observe(this.cellElm, {
      attributes: true,
      childList: true,
      attributeFilter: ["style", "id", "class"],
      subtree: true
    });
    this._running = true;
    this._anim = _MainAnimMethod ? _MainAnimMethod.bind(this) : () => {
      if (!this._running) return;
      this.updateFunds.forEach((update) => update());
      requestAnimationFrame(this._anim);
      if (this.focusedCamera) {
        this.threeRenderer.render(this.loadedScene, this.focusedCamera);
      }
    };
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        const dpr = window.devicePixelRatio || 1;
        this.threeRenderer.setPixelRatio(dpr);
        const safeWidth = Math.max(width, 1);
        const safeHeight = Math.max(height, 1);
        this.threeRenderer.setSize(safeWidth, safeHeight, false);
        if (this.focusedCamera && this.focusedCamera.isPerspectiveCamera) {
          this.focusedCamera.aspect = safeWidth / safeHeight;
        }
        if (this.focusedCamera) {
          this.focusedCamera.updateProjectionMatrix();
        }
      }
    });
    this._resizeObserver.observe(this.cellElm);
    this._anim();
  }
  _scheduleFullRepaint() {
    if (this._pendingStyleRepaint) return;
    this._pendingStyleRepaint = true;
    requestAnimationFrame(() => {
      this._pendingStyleRepaint = false;
      gatherAssetRules();
      paintCell(this);
      this._repaintKnownConvicts();
    });
  }
  _repaintKnownConvicts() {
    const visited = /* @__PURE__ */ new Set();
    for (const convict of this.classyConvicts) {
      if (!visited.has(convict)) {
        visited.add(convict);
        paintSpecificMuse(convict);
      }
    }
    for (const convict of this.namedConvicts) {
      if (!visited.has(convict)) {
        visited.add(convict);
        paintSpecificMuse(convict);
      }
    }
  }
  _normalizeClassList(input) {
    if (Array.isArray(input)) return input.filter(Boolean).map(String);
    if (typeof input === "string") return input.split(/\s+/).filter(Boolean);
    if (input && typeof input[Symbol.iterator] === "function") {
      return Array.from(input).filter(Boolean).map(String);
    }
    return [];
  }
  _ensureConvictClassAlias(convict) {
    if (Object.prototype.hasOwnProperty.call(convict, "classList")) return;
    Object.defineProperty(convict, "classList", {
      enumerable: false,
      configurable: true,
      get() {
        return this.userData.classList;
      },
      set(value) {
        var _a;
        let next = [];
        if (Array.isArray(value)) {
          next = value.filter(Boolean).map(String);
        } else if (typeof value === "string") {
          next = value.split(/\s+/).filter(Boolean);
        } else if (value && typeof value[Symbol.iterator] === "function") {
          next = Array.from(value).filter(Boolean).map(String);
        }
        const domEl = (_a = this.userData) == null ? void 0 : _a.domEl;
        if (domEl && domEl.className !== next.join(" ")) {
          domEl.className = next.join(" ");
          return;
        }
        this.userData.classList = next;
      }
    });
  }
  _removeClassIndex(convict, className) {
    const bucket = this._convictsByClass.get(className);
    if (!bucket) return;
    bucket.delete(convict);
    if (bucket.size === 0) {
      this._convictsByClass.delete(className);
    }
  }
  _syncConvictIdentity(convict, elm) {
    if (!convict || !elm) return;
    const prevId = convict.userData.domId || "";
    const prevClasses = Array.isArray(convict.userData.classList) ? convict.userData.classList : [];
    const nextId = elm.id || "";
    const nextClasses = this._normalizeClassList(elm.classList);
    if (prevId && this._convictsById.get(prevId) === convict) {
      this._convictsById.delete(prevId);
    }
    for (const cls of prevClasses) {
      this._removeClassIndex(convict, cls);
    }
    convict.userData.domId = nextId;
    convict.userData.classList = nextClasses;
    if (nextId) {
      convict.name = nextId;
    } else if (convict.name === prevId) {
      convict.name = "";
    }
    if (nextId) {
      this._convictsById.set(nextId, convict);
      this.namedConvicts.add(convict);
    } else {
      this.namedConvicts.delete(convict);
    }
    if (nextClasses.length) {
      this.classyConvicts.add(convict);
      for (const cls of nextClasses) {
        let bucket = this._convictsByClass.get(cls);
        if (!bucket) {
          bucket = /* @__PURE__ */ new Set();
          this._convictsByClass.set(cls, bucket);
        }
        bucket.add(convict);
      }
    } else {
      this.classyConvicts.delete(convict);
    }
  }
  /**
   * Initial scan of cell children.
   * @private
   */
  _ScanCell() {
    for (let i = 0; i < this.cellElm.children.length; i++) {
      const convictElm = this.cellElm.children[i];
      this.ScanElement(convictElm);
    }
  }
  /**
   * Convert a DOM element into a Three.js object and wire it up.
   *
   * @param {HTMLElement} elm
   */
  ScanElement(elm) {
    if (this._allConvictsByDom.has(elm)) return;
    const parentObj = this.getConvictByDom(elm.parentElement) || this.loadedScene;
    const instance = this.ConvertDomToObject(elm);
    if (instance === null) {
      for (let i = 0; i < elm.children.length; i++) {
        this.ScanElement(elm.children[i]);
      }
      return;
    }
    if (elm.tagName.includes("CAMERA")) {
      const rect = this.cellElm.getBoundingClientRect();
      const aspect = rect.height ? rect.width / rect.height : 1;
      if (elm.tagName === "PERSPECTIVECAMERA") {
        instance.fov = 75;
        instance.aspect = aspect;
        instance.far = 1e3;
        instance.near = 0.1;
      } else {
        const frustumSize = 20;
        instance.frustumSize = frustumSize;
        instance.aspect = aspect;
        instance.left = -frustumSize * aspect / 2;
        instance.right = frustumSize * aspect / 2;
        instance.top = frustumSize / 2;
        instance.bottom = -frustumSize / 2;
        instance.refreshLook = (fSize) => {
          instance.frustumSize = fSize;
          instance.left = -fSize * instance.aspect / 2;
          instance.right = fSize * instance.aspect / 2;
          instance.top = fSize / 2;
          instance.bottom = -fSize / 2;
          instance.updateProjectionMatrix();
        };
      }
      const rectW = rect.width || 1;
      const rectH = rect.height || 1;
      if (elm.hasAttribute("render")) {
        this.focusedCamera = instance;
        this.focusedCamera.updateProjectionMatrix();
        this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
        this.threeRenderer.setSize(rectW, rectH, false);
      } else if (!this.focusedCamera) {
        this.focusedCamera = instance;
        this.focusedCamera.updateProjectionMatrix();
      }
    }
    instance.userData.domEl = elm;
    instance.userData.extraParams = [];
    instance.userData.domId = "";
    instance.userData.classList = [];
    instance.transition = null;
    this._ensureConvictClassAlias(instance);
    parentObj.add(instance);
    this._allConvictsByDom.set(elm, instance);
    this._syncConvictIdentity(instance, elm);
    for (let i = 0; i < elm.children.length; i++) {
      this.ScanElement(elm.children[i]);
    }
    if (!Object.prototype.hasOwnProperty.call(elm, "convict")) {
      Object.defineProperty(elm, "convict", {
        value: this.getConvictByDom(elm),
        enumerable: false
      });
    }
  }
  /**
   * Tag → THREE.Object3D constructor.
   *
   * @param {HTMLElement} elm
   * @returns {THREE.Object3D|null}
   */
  ConvertDomToObject(elm) {
    if (elm.tagName === "CANVAS") return null;
    const key = elm.tagName.replace(/-/g, "");
    const Ctor = getClassMap()[key];
    if (!Ctor) {
      console.warn(`Unknown THREE class for <${elm.tagName.toLowerCase()}>`);
      return null;
    }
    return new Ctor();
  }
  /**
   * Remove a convict and its children.
   *
   * @param {THREE.Object3D|null} convict
   */
  removeConvict(convict) {
    var _a, _b;
    if (!convict) return;
    convict.children.slice().forEach((child) => {
      var _a2;
      const domNode = (_a2 = child.userData) == null ? void 0 : _a2.domEl;
      if (domNode) {
        this.removeConvict(this._allConvictsByDom.get(domNode));
      } else {
        this.removeConvict(child);
      }
    });
    const domId = (_a = convict.userData) == null ? void 0 : _a.domId;
    if (domId && this._convictsById.get(domId) === convict) {
      this._convictsById.delete(domId);
    }
    const classes = Array.isArray((_b = convict.userData) == null ? void 0 : _b.classList) ? convict.userData.classList : [];
    for (const cls of classes) {
      this._removeClassIndex(convict, cls);
    }
    this.classyConvicts.delete(convict);
    this.namedConvicts.delete(convict);
    if (convict.userData.domEl) {
      this._allConvictsByDom.delete(convict.userData.domEl);
      convict.userData.domEl.remove();
    }
    if (convict.parent) {
      convict.parent.remove(convict);
    }
  }
  /**
   * Get convict by DOM element.
   *
   * @param {HTMLElement} element
   */
  getConvictByDom(element) {
    return this._allConvictsByDom.get(element);
  }
  /**
   * Get convict by DOM id (global document lookup).
   *
   * @param {string} id
   */
  getConvictById(id) {
    return this._convictsById.get(id);
  }
  /**
   * Get all convicts with a given class.
   *
   * @param {string} className
   * @returns {Array<THREE.Object3D>}
   */
  getConvictsByClass(className) {
    return Array.from(this._convictsByClass.get(className) || []);
  }
  /**
   * Register a per-frame callback.
   *
   * @param {Function} fn
   */
  addUpdateFunction(fn) {
    if (typeof fn === "function") {
      const bound = fn.bind(this);
      bound.originalFn = fn;
      this.updateFunds.push(bound);
    }
  }
  /**
   * Remove a previously registered per-frame callback.
   *
   * @param {Function} fn
   */
  removeUpdateFunction(fn) {
    const idx = this.updateFunds.findIndex((item) => (item == null ? void 0 : item.originalFn) === fn);
    if (idx >= 0) {
      this.updateFunds.splice(idx, 1);
    }
  }
  /**
   * Tear down observers, handlers and canvas.
   */
  dispose() {
    this._running = false;
    this._resizeObserver.disconnect();
    this._styleObserver.disconnect();
    this._styleElemObserver.disconnect();
    this._styleHostObserver.disconnect();
    if (this._pointerMoveRaf) {
      cancelAnimationFrame(this._pointerMoveRaf);
      this._pointerMoveRaf = 0;
    }
    this._pendingPointerMoveEvt = null;
    this.cellElm.removeEventListener("mousemove", this._boundPointerMove);
    this.cellElm.removeEventListener("click", this._boundClick);
    this.cellElm.removeEventListener("mousedown", this._boundMouseDown);
    this.cellElm.removeEventListener("mouseup", this._boundMouseUp);
    this.cellElm.removeEventListener("dblclick", this._boundDoubleClick);
    this.cellElm.removeEventListener("contextmenu", this._boundContextMenu);
    const canvas = this.threeRenderer.domElement;
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }
};
__publicField(_Cell, "allCells", /* @__PURE__ */ new WeakMap());
let Cell = _Cell;
const _JTHREE = class _JTHREE {
  /**
   * Convert all <cell> elements in the document.
   */
  static init_convert() {
    if (!_JTHREE.__StyleTag__ && document.head) {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        cell > :not(canvas) {
          display: none;
        }
      `;
      document.head.appendChild(styleSheet);
      _JTHREE.__StyleTag__ = styleSheet;
    }
    document.querySelectorAll("cell").forEach((el) => {
      if (_JTHREE.__Loaded_Cells__.has(el)) return;
      _JTHREE.create_THREEJSRENDERER(el);
    });
  }
  /**
   * Legacy alias.
   */
  static _convert_init_() {
    return _JTHREE.init_convert();
  }
  /**
   * Create renderer + scene for a given <cell> element.
   *
   * @param {HTMLElement} cellEl
   * @returns {Cell}
   */
  static create_THREEJSRENDERER(cellEl) {
    if (_JTHREE.__Loaded_Cells__.has(cellEl)) {
      return _JTHREE.__Loaded_Cells__.get(cellEl);
    }
    const { canvas, width, height, dpr } = createWebGLOverlay(cellEl);
    const safeWidth = width || 1;
    const safeHeight = height || 1;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(safeWidth, safeHeight, false);
    renderer.setClearColor(0, 1);
    const scene = new THREE.Scene();
    const regex = /camera/i;
    const foundCameraElms = Array.from(cellEl.children).filter(
      (child) => regex.test(child.tagName) || regex.test(child.id) || regex.test(child.className)
    );
    let camera = null;
    if (foundCameraElms.length === 0) {
      camera = new THREE.PerspectiveCamera(75, safeWidth / safeHeight, 0.1, 1e3);
      console.warn("No camera found for", cellEl, ". Creating a default camera.");
    }
    const cell = new Cell(cellEl, renderer, scene, camera || null);
    _JTHREE.__Loaded_Cells__.set(cellEl, cell);
    cellEl.dispatchEvent(
      new CustomEvent("OnStart", { detail: { cell, CellEl: cellEl } })
    );
    return cell;
  }
};
__publicField(_JTHREE, "__Loaded_Cells__", /* @__PURE__ */ new WeakMap());
__publicField(_JTHREE, "__StyleTag__", null);
let JTHREE = _JTHREE;
function createWebGLOverlay(hostEl, glOptions = {}) {
  const { width, height } = hostEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (getComputedStyle(hostEl).position === "static") {
    hostEl.style.position = "relative";
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  Object.assign(canvas.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: "none"
    //zIndex: '-999'
  });
  hostEl.appendChild(canvas);
  const gl = canvas.getContext("webgl2", glOptions) || canvas.getContext("webgl", glOptions) || canvas.getContext("experimental-webgl", glOptions);
  if (!gl) {
    throw new Error("Your browser doesn’t support WebGL.");
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  return { canvas, gl, width, height, dpr };
}
JTHREE.init_convert();
window.JThree = JTHREE;
export {
  AllKeyFramesMap,
  CSSValueTo3JSValue,
  Cell,
  JTHREE as JThree,
  KeyFrameAnimationLerp,
  animateLerp,
  deep_searchParms,
  default_onCellClick_method,
  default_onCellContextMenu_method,
  default_onCellDoubleClick_method,
  default_onCellMouseDown_method,
  default_onCellMouseUp_method,
  default_onCellPointerMove_method,
  exchange_rule,
  fastRemoveArray,
  fastRemove_arry,
  gatherAssetRules,
  gatherKeyFrame_MAP,
  getAnimationMap,
  getAsset,
  getCSSRule,
  getClassMap,
  lerpNumber,
  lerpValue,
  loadAsset,
  paintCell,
  paintConstantMuse,
  paintConvict,
  paintExtraCell,
  paintSpecificMuse
};
//# sourceMappingURL=index.js.map
