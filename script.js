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
  document.title = language === "en" ? "Wang · Finance Research" : "Wang · 金融与经济研究";
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
const paperStorageKey = "wang-academic-profile-papers-v1";

function initialPapers() {
  return [...paperList.querySelectorAll(".paper-row")].map((row, index) => {
    const title = row.querySelector("h3");
    const description = row.querySelector("p");
    return {
      id: `paper-${index + 1}`,
      status: row.querySelector(".status").textContent.trim(),
      year: row.querySelector(".year").textContent.trim(),
      titleEn: title.dataset.en,
      titleZh: title.dataset.zh,
      descriptionEn: description.dataset.en,
      descriptionZh: description.dataset.zh
    };
  });
}

const defaults = initialPapers();

const publishedCssciPaper = {
  id: "paper-cssci-risk-contagion",
  status: "CSSCI",
  year: "2026",
  titleZh: "同群企业风险传染对货币政策风险承担渠道的影响研究",
  titleEn: "The Influence of Risk Contagion of the Same Group Enterprises on the Risk-Taking Channels of Monetary Policy",
  descriptionZh: "《经济与管理》· CSSCI · 2026年第40卷第3期，第68–76页",
  descriptionEn: "Economy and Management · CSSCI · Vol. 40, No. 3, pp. 68–76"
};

const bankFintechPaper = {
  id: "paper-bank-fintech-transmission",
  status: "SECOND REVIEW",
  year: "2026",
  titleZh: "银行金融科技与货币政策精准信贷传导",
  titleEn: "Bank Fintech and the Precision of Monetary Policy Credit Transmission",
  descriptionZh: "《山西财经大学学报》· CSSCI · 二审",
  descriptionEn: "Journal of Shanxi University of Finance and Economics · CSSCI · second-round review"
};

const innovationQualityPaper = {
  id: "paper-llm-innovation-quality",
  status: "FIRST REVIEW",
  year: "2026",
  titleZh: "基于大语言模型的企业创新质量测度及其绩效预测价值研究",
  titleEn: "The Measurement of Enterprise Innovation Quality Based on Large Language Models and Its Predictive Value for Performance",
  descriptionZh: "《南开管理评论》· CSSCI · 一审",
  descriptionEn: "Nankai Business Review · CSSCI · first-round review"
};

const managedPapers = [bankFintechPaper, innovationQualityPaper, publishedCssciPaper];

function migratePapers(saved) {
  let migrated = saved.filter(paper =>
    paper.titleEn !== "Chinese C-journal manuscript" && paper.titleZh !== "中文C刊稿件"
  );

  const firstTierPlaceholder = migrated.findIndex(paper =>
    paper.titleEn === "Chinese first-tier journal manuscript" || paper.titleZh === "中文一类期刊稿件"
  );
  if (firstTierPlaceholder >= 0) migrated.splice(firstTierPlaceholder, 1, innovationQualityPaper);

  managedPapers.forEach(managed => {
    const match = migrated.findIndex(paper =>
      paper.id === managed.id || paper.titleEn === managed.titleEn || paper.titleZh === managed.titleZh
    );
    if (match >= 0) migrated[match] = managed;
    else migrated.push(managed);
  });

  const stageRank = paper => {
    const status = paper.status.toLowerCase();
    if (status.includes("r&r") || status.includes("revise")) return 0;
    if (status.includes("second") || status.includes("二审")) return 1;
    if (status.includes("first") || status.includes("一审")) return 2;
    if (paper.id === publishedCssciPaper.id) return 3;
    return 4;
  };
  return migrated.map((paper, index) => ({ paper, index }))
    .sort((a, b) => stageRank(a.paper) - stageRank(b.paper) || a.index - b.index)
    .map(item => item.paper);
}

function loadPapers() {
  try {
    const saved = JSON.parse(localStorage.getItem(paperStorageKey));
    return migratePapers(Array.isArray(saved) ? saved : defaults);
  } catch {
    return migratePapers(defaults);
  }
}

let papers = loadPapers();
localStorage.setItem(paperStorageKey, JSON.stringify(papers));

function savePapers() {
  localStorage.setItem(paperStorageKey, JSON.stringify(papers));
}

function statusClass(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes("r&r") || normalized.includes("revise")) return "rr";
  if (normalized.includes("revised") || normalized.includes("修回") || normalized.includes("接收")) return "revised";
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

paperList.addEventListener("click", event => {
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
  papers = papers.filter(item => item.id !== paper.id);
  savePapers();
  renderPapers();
});

paperForm.addEventListener("submit", event => {
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
  papers = id ? papers.map(item => item.id === id ? paper : item) : [...papers, paper];
  savePapers();
  renderPapers();
  closePaperDialog();
});

renderPapers();
setLanguage("en");

