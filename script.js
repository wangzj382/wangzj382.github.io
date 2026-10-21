const languageToggle = document.getElementById("languageToggle");
let language = "en";

function setLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach(element => {
    element.textContent = element.dataset[language];
  });
  languageToggle.textContent = language === "en" ? "中文" : "EN";
  languageToggle.setAttribute("aria-label", language === "en" ? "切换为中文" : "Switch to English");
  document.title = language === "en" ? "Zhengjie Wang · Finance Research" : "Zhengjie Wang · 金融与经济研究";
}

languageToggle.addEventListener("click", () => setLanguage(language === "en" ? "zh" : "en"));
document.getElementById("currentYear").textContent = new Date().getFullYear();

const header = document.querySelector(".site-header");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 20), { passive: true });

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(element => observer.observe(element));

const paperList = document.getElementById("paperList");
const paperDialog = document.getElementById("paperDialog");
const paperForm = document.getElementById("paperForm");

const repositoryApi = "https://api.github.com/repos/wangzj382/wangzj382.github.io/contents/index.html";
let sourceHtml = "";
let sourceSha = "";
let publishing = false;
let githubToken = "";
const syncNotice = document.createElement("p");
syncNotice.setAttribute("role", "status");
syncNotice.setAttribute("aria-live", "polite");
paperList.before(syncNotice);
const formNotice = document.createElement("p");
formNotice.setAttribute("role", "status");
formNotice.setAttribute("aria-live", "polite");
paperForm.append(formNotice);
function notice(message) { syncNotice.textContent = message; formNotice.textContent = message; }
function readPapers(root) {
  return [...root.querySelectorAll(".paper-row")].map((row, index) => ({
    id: row.dataset.paperId || `paper-${index + 1}`,
    status: row.querySelector(".status").textContent.trim(),
    year: row.querySelector(".year").textContent.trim(),
    titleEn: row.querySelector("h3").dataset.en,
    titleZh: row.querySelector("h3").dataset.zh,
    descriptionEn: row.querySelector("p").dataset.en,
    descriptionZh: row.querySelector("p").dataset.zh
  }));
}
let papers = readPapers(paperList);
function decodeContent(content) {
  return new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g, "")), c => c.charCodeAt(0)));
}
function encodeContent(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
async function readSource() {
  const response = await fetch(repositoryApi + "?ref=main&t=" + Date.now(), {
    cache: "no-store", headers: { Accept: "application/vnd.github+json" }
  });
  if (!response.ok) throw new Error("无法读取 GitHub 最新版本，请稍后刷新重试。");
  const data = await response.json();
  return { sha: data.sha, html: decodeContent(data.content) };
}
function requestToken() {
  if (githubToken) return Promise.resolve(githubToken);
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "paper-dialog";
    const form = document.createElement("form");
    const heading = document.createElement("h3");
    heading.textContent = "授权发布到 GitHub";
    const info = document.createElement("p");
    info.textContent = "创建 Fine-grained Token：仅选择 wangzj382.github.io 仓库，Contents 权限设为 Read and write。Token 仅保留在当前页面内存中，关闭或刷新页面后清除。请勿在聊天中发送 Token。";
    const link = document.createElement("a");
    link.href = "https://github.com/settings/personal-access-tokens/new";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "打开 GitHub 创建 Token";
    const label = document.createElement("label");
    label.textContent = "GitHub Token";
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.required = true;
    label.append(input);
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "取消";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "授权并发布";
    actions.append(cancel, submit);
    form.append(heading, info, link, label, actions);
    dialog.append(form);
    document.body.append(dialog);
    let settled = false;
    function finish(value) {
      if (settled) return;
      settled = true;
      input.value = "";
      dialog.close();
      dialog.remove();
      resolve(value);
    }
    cancel.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", event => { event.preventDefault(); finish(null); });
    form.addEventListener("submit", event => {
      event.preventDefault();
      githubToken = input.value.trim();
      finish(githubToken || null);
    });
    dialog.showModal();
    input.focus();
  });
}
function publishedHtml(nextPapers) {
  const doc = new DOMParser().parseFromString(sourceHtml, "text/html");
  const list = doc.getElementById("paperList");
  list.replaceChildren();
  nextPapers.forEach(paper => {
    const row = doc.createElement("article");
    row.className = "paper-row";
    row.dataset.paperId = paper.id;
    row.setAttribute("role", "listitem");
    const status = doc.createElement("span");
    status.className = "status " + statusClass(paper.status);
    status.textContent = paper.status;
    const copy = doc.createElement("div");
    for (const [tag, en, zh] of [["h3", paper.titleEn, paper.titleZh], ["p", paper.descriptionEn, paper.descriptionZh]]) {
      const element = doc.createElement(tag);
      element.dataset.en = en;
      element.dataset.zh = zh;
      element.textContent = en;
      copy.append(element);
    }
    const year = doc.createElement("span");
    year.className = "year";
    year.textContent = paper.year;
    row.append(status, copy, year);
    list.append(row);
  });
  // Replace only the paper list; preserve the rest of the source byte for byte.
  const start = sourceHtml.indexOf('<div class="paper-list');
  const end = sourceHtml.indexOf('\n    </section>', start);
  if (start < 0 || end < 0) throw new Error("页面结构已变化，请刷新后重试。");
  return sourceHtml.slice(0, start) + list.outerHTML + sourceHtml.slice(end);
}
async function savePapers(nextPapers) {
  if (!sourceSha || publishing) return false;
  publishing = true;
  try {
    const token = await requestToken();
    if (!token) { notice("已取消发布，线上内容未更改。"); return false; }
    notice("正在保存到 GitHub… / Publishing…");
    const latest = await readSource();
    if (latest.sha !== sourceSha) throw new Error("网站已被其他页面更新。请先复制未保存的修改，再刷新页面重新编辑，避免覆盖新版本。");
    const html = publishedHtml(nextPapers);
    const response = await fetch(repositoryApi, {
      method: "PUT",
      headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Update papers from homepage editor", branch: "main", sha: sourceSha, content: encodeContent(html) })
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) githubToken = "";
      throw new Error(response.status === 409 || response.status === 422
        ? "版本冲突，请保留修改并刷新页面后重试。"
        : "GitHub 保存失败（" + response.status + "）。请检查 Token 的仓库选择及 Contents 写入权限，然后重试。");
    }
    const result = await response.json();
    sourceSha = result.content.sha;
    sourceHtml = html;
    papers = nextPapers;
    renderPapers();
    notice("已保存到 GitHub。网站正在自动部署，其他访客将在部署完成后看到更新（通常约 1–2 分钟）。");
    return true;
  } catch (error) {
    notice(error.message || "网络连接失败，请重试。");
    return false;
  } finally { publishing = false; }
}
async function initializePublishing() {
  notice("正在读取最新论文信息… / Loading latest papers…");
  try {
    const source = await readSource();
    const doc = new DOMParser().parseFromString(source.html, "text/html");
    const list = doc.getElementById("paperList");
    if (!list) throw new Error("未找到论文列表，暂时无法编辑。");
    papers = readPapers(list);
    sourceHtml = source.html;
    sourceSha = source.sha;
    renderPapers();
    notice("修改后点击“保存并发布”，即可更新公开主页。发布需要 GitHub 仓库写入授权。");
  } catch (error) { notice(error.message); }
}
function statusClass(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes("r&r") || normalized.includes("revise")) return "rr";
  if (normalized.includes("published") || normalized.includes("revised") || normalized.includes("修回") || normalized.includes("接收")) return "revised";
  return "review";
}

function translatedElement(tagName, en, zh) {
  const element = document.createElement(tagName);
  element.dataset.en = en;
  element.dataset.zh = zh;
  element.textContent = language === "zh" ? zh : en;
  return element;
}

function renderPapers() {
  paperList.replaceChildren();
  papers.forEach(paper => {
    const article = document.createElement("article");
    article.className = "paper-row";
    article.setAttribute("role", "listitem");

    const status = document.createElement("span");
    status.className = `status ${statusClass(paper.status)}`;
    status.textContent = paper.status;

    const copy = document.createElement("div");
    copy.append(
      translatedElement("h3", paper.titleEn, paper.titleZh),
      translatedElement("p", paper.descriptionEn, paper.descriptionZh)
    );

    const year = document.createElement("span");
    year.className = "year";
    year.textContent = paper.year;

    const actions = document.createElement("div");
    actions.className = "paper-actions";
    const edit = translatedElement("button", "Edit", "修改");
    edit.type = "button";
    edit.className = "paper-action";
    edit.dataset.editPaper = paper.id;
    const remove = translatedElement("button", "Delete", "删除");
    remove.type = "button";
    remove.className = "paper-action delete";
    remove.dataset.deletePaper = paper.id;
    actions.append(edit, remove);

    article.append(status, copy, year, actions);
    paperList.append(article);
  });
  setLanguage(language);
}

function setField(id, value) {
  document.getElementById(id).value = value || "";
}

function openPaperDialog(paper = null) {
  if (!sourceSha || publishing) { notice("请等待最新内容加载或当前发布完成。"); return; }
  setField("paperId", paper?.id);
  setField("paperStatus", paper?.status || "");
  setField("paperYear", paper?.year || new Date().getFullYear());
  setField("paperTitleZh", paper?.titleZh);
  setField("paperTitleEn", paper?.titleEn);
  setField("paperDescriptionZh", paper?.descriptionZh);
  setField("paperDescriptionEn", paper?.descriptionEn);
  const heading = document.getElementById("paperDialogTitle");
  heading.dataset.en = paper ? "Edit paper" : "Add paper";
  heading.dataset.zh = paper ? "修改论文" : "新增论文";
  setLanguage(language);
  paperDialog.showModal();
  document.getElementById("paperTitleZh").focus();
}

function closePaperDialog() {
  paperDialog.close();
  paperForm.reset();
}

document.getElementById("pipelineAdd").addEventListener("click", () => openPaperDialog());
document.getElementById("paperDialogClose").addEventListener("click", closePaperDialog);
document.getElementById("paperCancel").addEventListener("click", closePaperDialog);
paperDialog.addEventListener("click", event => {
  if (event.target === paperDialog) closePaperDialog();
});

paperList.addEventListener("click", async event => {
  if (!sourceSha || publishing) return;
  const editButton = event.target.closest("[data-edit-paper]");
  if (editButton) {
    openPaperDialog(papers.find(paper => paper.id === editButton.dataset.editPaper));
    return;
  }
  const deleteButton = event.target.closest("[data-delete-paper]");
  if (!deleteButton) return;
  const paper = papers.find(item => item.id === deleteButton.dataset.deletePaper);
  const prompt = language === "zh" ? `确定删除“${paper.titleZh}”吗？` : `Delete “${paper.titleEn}”?`;
  if (!window.confirm(prompt)) return;
  await savePapers(papers.filter(item => item.id !== paper.id));
});

paperForm.addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.getElementById("paperId").value;
  const paper = {
    id: id || `paper-${Date.now()}`,
    status: document.getElementById("paperStatus").value.trim(),
    year: document.getElementById("paperYear").value.trim(),
    titleZh: document.getElementById("paperTitleZh").value.trim(),
    titleEn: document.getElementById("paperTitleEn").value.trim(),
    descriptionZh: document.getElementById("paperDescriptionZh").value.trim(),
    descriptionEn: document.getElementById("paperDescriptionEn").value.trim()
  };
  const nextPapers = id ? papers.map(item => item.id === id ? paper : item) : [...papers, paper];
  const saved = await savePapers(nextPapers);
  if (saved) closePaperDialog();
});

renderPapers();
setLanguage("en");

initializePublishing();
