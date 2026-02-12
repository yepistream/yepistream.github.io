class DirNode {
    constructor(Name,FileType, Parent, Children, RealURL = undefined,opened = false) { 
        this.Name = Name;
        
        switch (FileType) {
            case "Directory":
            case "HTML":
                this.FileType = FileType;
                break;
            default:
                console.warn("Tried To Parse An Unkown Type");
                this.FileType = "Hidden";
                break;
        }
        this.Parent = Parent; 
        this.Children = Children;
        this.RealURL = RealURL;
        this.opened = opened;
        

        if(Children.length > 0 ){
            Children.forEach(element => {
                element.Parent = this;
            });
        }
        
        this.FakeDir = this.Name;
    }

    getFakeDir(){
        if(this.Parent){
        const hasHtmlExt = /\.html?$/i.test(this.Name);
        const suffix = this.FileType == "Directory" || hasHtmlExt ? "" : ".html";
        return this.FakeDir = this.Parent.getFakeDir() + "/" + this.Name + suffix;
        }
        return this.Name;
    }
}

function toAbsoluteUrl(url, baseUrl = window.location.href) {
try {
    return new URL(url, baseUrl).href;
} catch (_err) {
    return url;
}
}

function sortDirNodes(a, b) {
if (a.FileType !== b.FileType) return a.FileType === "Directory" ? -1 : 1;
return a.Name.localeCompare(b.Name);
}

function normalizeSubPath(pathValue = "") {
const raw = String(pathValue || "").trim();
if (!raw) return "";
return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

function objectTreeToChildrenEntries(obj) {
const entries = [];

for (const [name, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
    const explicitShape = ["type", "children", "url", "realUrl", "href", "path", "name", "opened"].some(k => Object.prototype.hasOwnProperty.call(value, k));
    if (explicitShape) entries.push({ ...value, name: value.name || name });
    else entries.push({ name, type: "directory", children: objectTreeToChildrenEntries(value) });
    continue;
    }

    if (Array.isArray(value)) {
    entries.push({ name, type: "directory", children: value });
    continue;
    }

    entries.push({ name, type: "html", url: String(value ?? name) });
}

return entries;
}

function normalizeManifest(manifest, rootName = "[ROOT]") {
if (Array.isArray(manifest)) {
    return { name: rootName, type: "directory", children: manifest };
}

if (manifest && typeof manifest === "object") {
    const explicitShape = ["type", "children", "url", "realUrl", "href", "path", "name", "opened"].some(k => Object.prototype.hasOwnProperty.call(manifest, k));
    if (explicitShape) return { ...manifest, name: manifest.name || rootName };
    return { name: rootName, type: "directory", children: objectTreeToChildrenEntries(manifest) };
}

throw new Error("Invalid JSON manifest. Expected object or array.");
}

function manifestEntryToDirNode(entry, baseUrl) {
if (typeof entry === "string") {
    const filename = decodeURIComponent(entry.split("/").pop() || "file.html");
    return new DirNode(filename, "HTML", null, [], toAbsoluteUrl(entry, baseUrl), false);
}

if (!entry || typeof entry !== "object") return null;

const kind = String(entry.type || (entry.children ? "directory" : "html")).toLowerCase();
if (kind === "directory" || kind === "dir" || kind === "folder") {
    const childrenRaw = Array.isArray(entry.children) ? entry.children : [];
    const children = childrenRaw
    .map(child => manifestEntryToDirNode(child, baseUrl))
    .filter(Boolean)
    .sort(sortDirNodes);
    return new DirNode(entry.name || "Directory", "Directory", null, children, undefined, Boolean(entry.opened));
}

const fileName =
    entry.name ||
    (entry.url ? decodeURIComponent(String(entry.url).split("/").pop() || "file.html") : "file.html");
const realUrl = toAbsoluteUrl(entry.realUrl || entry.url || entry.href || entry.path || fileName, baseUrl);
return new DirNode(fileName, "HTML", null, [], realUrl, Boolean(entry.opened));
}

function buildDirNodeFromManifest(manifest, options = {}) {
const normalized = normalizeManifest(manifest, options.rootName || "[ROOT]");
const baseUrl = options.baseUrl || window.location.href;
const root = manifestEntryToDirNode(normalized, baseUrl);
if (!root || root.FileType !== "Directory") {
    throw new Error("Manifest root must resolve to a Directory.");
}
root.opened = options.opened ?? true;
return root;
}

function parseGitHubSource(urlText) {
let u;
try {
    u = new URL(urlText);
} catch (_err) {
    return null;
}

if (u.hostname === "github.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repoRaw, kind, ref, ...rest] = parts;
    const repo = repoRaw.replace(/\.git$/i, "");
    const path = kind === "tree" || kind === "blob" ? rest.join("/") : "";
    const refs = [];
    if (ref && (kind === "tree" || kind === "blob")) refs.push(ref);
    refs.push("main", "master", "gh-pages");

    return { owner, repo, path, refs: [...new Set(refs)] };
}

if (u.hostname.endsWith(".github.io")) {
    const owner = u.hostname.split(".")[0];
    const pathParts = u.pathname.split("/").filter(Boolean);
    let repo = `${owner}.github.io`;
    let path = "";

    if (pathParts.length > 0 && pathParts[0] !== `${owner}.github.io`) {
    repo = pathParts[0];
    path = pathParts.slice(1).join("/");
    }

    return { owner, repo, path, refs: ["gh-pages", "main", "master"] };
}

return null;
}

async function fetchGitHubContents(owner, repo, ref, path = "") {
const encodedPath = path
    ? "/" + path.split("/").filter(Boolean).map(segment => encodeURIComponent(segment)).join("/")
    : "";
const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${encodedPath}?ref=${encodeURIComponent(ref)}`;
const res = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} for ${owner}/${repo}@${ref}/${path || ""}`);
}
return res.json();
}

async function buildDirNodeFromGitHub(owner, repo, ref, path = "", displayName = "[ROOT]") {
const listing = await fetchGitHubContents(owner, repo, ref, path);

if (!Array.isArray(listing)) {
    if (listing.type === "file") {
    const fileUrl = listing.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${listing.path}`;
    return new DirNode(listing.name, "HTML", null, [], fileUrl, false);
    }
    throw new Error(`Path "${path}" is not a directory.`);
}

const children = [];
for (const item of listing) {
    if (item.type === "dir") {
    children.push(await buildDirNodeFromGitHub(owner, repo, ref, item.path, item.name));
    } else if (item.type === "file") {
    const fileUrl = item.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${item.path}`;
    children.push(new DirNode(item.name, "HTML", null, [], fileUrl, false));
    }
}

children.sort(sortDirNodes);
return new DirNode(displayName, "Directory", null, children, undefined, false);
}

async function buildDirNodeFromDirectoryListing(startUrl, options = {}) {
const rootUrl = new URL(startUrl, options.baseUrl || window.location.href);
if (!rootUrl.pathname.endsWith("/")) rootUrl.pathname += "/";
const visited = new Set();

const walk = async (dirUrl, displayName) => {
    const key = dirUrl.href;
    if (visited.has(key)) return new DirNode(displayName, "Directory", null, [], undefined, false);
    visited.add(key);

    const res = await fetch(key);
    if (!res.ok) {
    throw new Error(`Directory URL cannot be listed: ${key} (${res.status})`);
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a[href]"));
    const childMap = new Map();

    for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("?") || href.startsWith("../")) continue;

    const abs = new URL(href, key);
    if (abs.origin !== dirUrl.origin) continue;
    if (!abs.pathname.startsWith(dirUrl.pathname)) continue;

    const relative = abs.pathname.slice(dirUrl.pathname.length);
    if (!relative) continue;

    const segments = relative.split("/").filter(Boolean);
    if (segments.length !== 1) continue;

    const childName = decodeURIComponent(segments[0]);
    const isDir = href.endsWith("/") || abs.pathname.endsWith("/");
    const mapKey = `${isDir ? "dir" : "file"}:${childName}`;
    if (childMap.has(mapKey)) continue;

    if (isDir) {
        const childDirUrl = new URL(`${childName}/`, key);
        childMap.set(mapKey, await walk(childDirUrl, childName));
    } else {
        childMap.set(mapKey, new DirNode(childName, "HTML", null, [], abs.href, false));
    }
    }

    const children = Array.from(childMap.values()).sort(sortDirNodes);
    return new DirNode(displayName, "Directory", null, children, undefined, false);
};

const defaultName = decodeURIComponent(rootUrl.pathname.split("/").filter(Boolean).pop() || "[ROOT]");
const root = await walk(rootUrl, options.rootName || defaultName);
root.opened = options.opened ?? true;
return root;
}

async function buildDirNodeHierarchy(source, options = {}) {
if (source && typeof source === "object") {
    return buildDirNodeFromManifest(source, options);
}

if (typeof source !== "string") {
    throw new Error("Source must be JSON (object/string) or a URL string.");
}

const trimmed = source.trim();
if (!trimmed) throw new Error("Source string is empty.");

if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return buildDirNodeFromManifest(JSON.parse(trimmed), options);
}

if (/\.json(?:$|[?#])/i.test(trimmed)) {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`Unable to fetch JSON manifest: ${trimmed} (${res.status})`);
    const manifest = await res.json();
    const nextOptions = { ...options, baseUrl: new URL(".", trimmed).href };
    return buildDirNodeFromManifest(manifest, nextOptions);
}

const githubSource = parseGitHubSource(trimmed);
if (githubSource) {
    let lastError = null;
    const forcedPath = normalizeSubPath(options.onlyPath);
    const pathToLoad = forcedPath || normalizeSubPath(githubSource.path);
    for (const ref of githubSource.refs) {
    try {
        const rootName =
        options.rootName ||
        (pathToLoad
            ? decodeURIComponent(pathToLoad.split("/").filter(Boolean).pop())
            : `[ROOT] ${githubSource.owner}/${githubSource.repo}`);

        const root = await buildDirNodeFromGitHub(
        githubSource.owner,
        githubSource.repo,
        ref,
        pathToLoad || "",
        rootName
        );
        root.opened = options.opened ?? true;
        return root;
    } catch (err) {
        lastError = err;
    }
    }
    throw new Error(`Failed to load GitHub tree. ${lastError ? lastError.message : ""}`);
}

return buildDirNodeFromDirectoryListing(trimmed, options);
}

function WriteDirectory(dirNode, dirAmount = 0, elm = null) {
    let finalSpacing = "|\t".repeat(dirAmount) + "|";
    let largestString = 0;
    const container = document.createElement("div");

    const makeLine = (text,onclickFunc = null) => {
        const lineEl = document.createElement("div");
        lineEl.classList.add("clickable_text");
        lineEl.textContent = text;
        lineEl.onclick = onclickFunc;
        container.appendChild(lineEl);
    };

    // Root directory
    if (dirNode.Parent == null) {
        makeLine(dirNode.Name + "/");
    }

    // Children
    dirNode.Children.forEach(n => {
        if (n.FileType !== "Hidden") {
            let line = finalSpacing + "->/" + n.Name;

            switch (n.FileType) {
            case "Directory":
                if (n.opened) {
                    line += " \t[-]";
                    makeLine(line, ()=>{
                    n.opened = false;
                    if(elm) elm.replaceChildren(WriteDirectory(testDir,0,elm))
                    });
                    container.appendChild(WriteDirectory(n, dirAmount + 1));
                } else {
                    line += "... [+]";
                    makeLine(line,()=>{
                    n.opened = true;
                    if(elm) elm.replaceChildren(WriteDirectory(testDir,0,elm))
                    });
                }
                break;
            case "HTML":
                makeLine(line, ()=>{
                CurrentLoadedFileNode = n;
                if (n.RealURL) Iframe.src = n.RealURL;
                setTextimateText(CurrentFileNameHeader, "Currently Peeking:" + CurrentLoadedFileNode.getFakeDir());
                })


                break;
            default:
                makeLine(line);
                break;
            }

            // Track longest name
            if (largestString < n.Name.length) {
                largestString = n.Name.length;
            }
        }
    });

    // Bottom divider line
    let fuckme = "-".repeat(largestString + 4) + "|"; // +4 for the initial "----"
    makeLine(finalSpacing + fuckme);

    return container;
}

let testDir = null;
const assgum = document.getElementById("DirTree");
const CurrentFileNameHeader = document.getElementById("DirTree_Header");
const Iframe = document.getElementById("iframeMain");
let CurrentLoadedFileNode = null;

assgum.style.whiteSpace = "pre";

const defaultSource = {
name: "[ROOT] X:",
type: "directory",
opened: true,
children: [
    { name: "AssSmall2.html", type: "html", url: "./AssSmall2.html" },
    {
    name: "AssSmall1",
    type: "directory",
    children: [
        { name: "AssSmall4.html", type: "html", url: "./AssSmall4.html" },
        { name: "AssSmall6.html", type: "html", url: "./AssSmall6.html" }
    ]
    },
    { name: "AssSmall2-Alt.html", type: "html", url: "./AssSmall2-Alt.html" }
]
};



function textimate(elm, original_text = "", speedMs = 120) {
if (!elm) return null;

const msg = (original_text && original_text.length > 0 ? original_text : elm.innerText || "").replace(/\r?\n/g, " ");
if (msg.length === 0) return null;

elm.style.whiteSpace = "pre";
elm.style.overflow = "hidden";

if (elm._textimateTimer) clearInterval(elm._textimateTimer);

const probe = document.createElement("span");
probe.textContent = "M";
probe.style.visibility = "hidden";
probe.style.position = "absolute";
probe.style.whiteSpace = "pre";
elm.appendChild(probe);
const charWidth = Math.max(1, probe.getBoundingClientRect().width);
probe.remove();

elm._textimateState = {
    msg,
    pos: -msg.length,
    charWidth
};

const draw = () => {
    const widthChars = Math.max(1, Math.floor(elm.clientWidth / elm._textimateState.charWidth));
    const frame = Array(widthChars).fill(" ");

    for (let i = 0; i < elm._textimateState.msg.length; i++) {
    const col = elm._textimateState.pos + i;
    if (col >= 0 && col < widthChars) frame[col] = elm._textimateState.msg[i];
    }

    elm.textContent = frame.join("");
    elm._textimateState.pos = elm._textimateState.pos >= widthChars ? -elm._textimateState.msg.length : elm._textimateState.pos + 1;
};
    
elm._textimateDraw = draw;
draw();
elm._textimateTimer = setInterval(draw, speedMs);
return elm._textimateTimer;
}

function setTextimateText(elm, newText, resetPosition = true) {
if (!elm || !elm._textimateState) return;

const msg = String(newText ?? "").replace(/\r?\n/g, " ");
elm._textimateState.msg = msg;
if (resetPosition) elm._textimateState.pos = -msg.length;

if (elm._textimateDraw) elm._textimateDraw();
}

function findFirstHtmlNode(node) {
if (!node) return null;
if (node.FileType === "HTML") return node;
for (const child of node.Children || []) {
    const found = findFirstHtmlNode(child);
    if (found) return found;
}
return null;
}

async function loadSourceIntoDirTree(source, options = {}) {
testDir = await buildDirNodeHierarchy(source, options);
assgum.replaceChildren(WriteDirectory(testDir, 0, assgum));

CurrentLoadedFileNode = findFirstHtmlNode(testDir);
if (CurrentLoadedFileNode) {
    if (CurrentLoadedFileNode.RealURL) Iframe.src = CurrentLoadedFileNode.RealURL;
    setTextimateText(CurrentFileNameHeader, "Currently Viewing : " + CurrentLoadedFileNode.getFakeDir());
} else {
    setTextimateText(CurrentFileNameHeader, "Currently Viewing : [No HTML file found]");
}

return testDir;
}

window.buildDirNodeHierarchy = buildDirNodeHierarchy;
window.loadSourceIntoDirTree = loadSourceIntoDirTree;

textimate(CurrentFileNameHeader);

(async () => { //Probs Will Fail.
try {
    await loadSourceIntoDirTree("https://github.com/yepistream/yepistream.github.io", {
    baseUrl: window.location.href,
    rootName: "[ROOT] X:",  
    onlyPath: "pages",
    opened: true
    });
} catch (err) {
    console.error(err);
    setTextimateText(CurrentFileNameHeader, "Tree load failed. See console.");
}
})();
