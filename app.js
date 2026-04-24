let sources = [];
const FAVORITES_STORAGE_KEY = "workflow_jobs_favorites";
const KZ_CITIES = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Актау",
  "Актобе",
  "Атырау",
  "Караганда",
  "Павлодар",
  "Костанай",
  "Кокшетау",
  "Петропавловск",
  "Усть-Каменогорск",
  "Семей",
  "Талдыкорган",
  "Тараз",
  "Туркестан",
  "Кызылорда",
  "Уральск",
  "Жезказган",
  "Экибастуз",
  "Рудный",
  "Темиртау",
  "Жанаозен",
  "Балхаш",
  "Сатпаев",
  "Конаев",
  "Кульсары",
  "Аксай",
  "Степногорск",
  "Риддер",
  "Щучинск",
  "Текели",
  "Сарыагаш",
  "Аркалык",
  "Шу",
  "Жаркент",
  "Аягоз",
  "Мангистау",
];

const state = {
  jobs: [],
  search: "",
  sourceId: "all",
  type: "all",
  activeSection: "jobs",
  selectedCity: "all",
  favorites: new Set(),
};

const els = {
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  vacancyCount: document.querySelector("#vacancyCount"),
  jobList: document.querySelector("#jobList"),
  favoriteJobList: document.querySelector("#favoriteJobList"),
  remoteJobList: document.querySelector("#remoteJobList"),
  cityJobList: document.querySelector("#cityJobList"),
  telegramJobList: document.querySelector("#telegramJobList"),
  sourceList: document.querySelector("#sourceList"),
  emptyState: document.querySelector("#emptyState"),
  favoriteEmptyState: document.querySelector("#favoriteEmptyState"),
  remoteEmptyState: document.querySelector("#remoteEmptyState"),
  cityEmptyState: document.querySelector("#cityEmptyState"),
  telegramEmptyState: document.querySelector("#telegramEmptyState"),
  refreshBtn: document.querySelector("#refreshBtn"),
  cardTpl: document.querySelector("#jobCardTemplate"),
  statusLine: document.querySelector("#statusLine"),
  sectionTabs: document.querySelectorAll(".section-tab"),
  sectionPanels: document.querySelectorAll(".section-panel"),
  analyticsTotal: document.querySelector("#analyticsTotal"),
  analyticsLiveSources: document.querySelector("#analyticsLiveSources"),
  analyticsTelegramJobs: document.querySelector("#analyticsTelegramJobs"),
  analyticsCatalogSources: document.querySelector("#analyticsCatalogSources"),
  cityFilters: document.querySelector("#cityFilters"),
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSourceById(sourceId) {
  return sources.find((source) => source.id === sourceId);
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    state.favorites = new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    state.favorites = new Set();
  }
}

function persistFavorites() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favorites]));
}

function isFavorite(jobId) {
  return state.favorites.has(jobId);
}

function toggleFavorite(jobId) {
  if (state.favorites.has(jobId)) {
    state.favorites.delete(jobId);
  } else {
    state.favorites.add(jobId);
  }
  persistFavorites();
  renderAllJobSections();
}

function buildJobCard(job) {
  const source = getSourceById(job.sourceId);
  const node = els.cardTpl.content.cloneNode(true);
  node.querySelector(".job-title").textContent = job.title;
  node.querySelector(".job-source").textContent = source ? source.name : "Источник неизвестен";
  node.querySelector(".job-company").textContent = `Компания: ${job.company}`;
  node.querySelector(".job-location").textContent = `Локация: ${job.location}`;
  node.querySelector(".job-description").textContent = job.description;
  node.querySelector(".job-date").textContent = `Опубликовано: ${formatDate(job.postedAt)}`;
  const link = node.querySelector(".job-link");
  link.href = job.url;

  const favoriteBtn = node.querySelector(".favorite-btn");
  const favorite = isFavorite(job.id);
  favoriteBtn.textContent = favorite ? "В избранном" : "В избранное";
  favoriteBtn.classList.toggle("is-favorite", favorite);
  favoriteBtn.addEventListener("click", () => toggleFavorite(job.id));

  const tagsContainer = node.querySelector(".job-tags");
  for (const tag of job.tags) {
    const tagNode = document.createElement("span");
    tagNode.className = "tag";
    tagNode.textContent = tag;
    tagsContainer.appendChild(tagNode);
  }

  return node;
}

function renderJobCollection(targetList, targetEmptyState, jobs, emptyMessage) {
  targetList.innerHTML = "";
  if (!jobs.length) {
    targetEmptyState.textContent = emptyMessage;
    targetEmptyState.classList.remove("hidden");
    return;
  }
  targetEmptyState.classList.add("hidden");
  for (const job of jobs) {
    targetList.appendChild(buildJobCard(job));
  }
}

function renderSources() {
  els.sourceList.innerHTML = "";
  els.sourceFilter.innerHTML = `<option value="all">Все источники</option>`;

  for (const source of sources) {
    const statusText =
      source.status === "live"
        ? "LIVE"
        : source.status === "setup-needed"
          ? "Нужна настройка"
          : "Каталог";
    const div = document.createElement("div");
    div.className = "source-item";
    div.innerHTML = `
      <div>
        <strong>${source.name}</strong>
        <div><span class="source-status source-status-${source.status || "catalog"}">${statusText}</span></div>
        <div>${source.note}</div>
      </div>
      <a href="${source.url}" target="_blank" rel="noopener noreferrer">Открыть</a>
    `;
    els.sourceList.appendChild(div);

    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.name;
    els.sourceFilter.appendChild(option);
  }
}

function renderCityFilterButtons() {
  els.cityFilters.innerHTML = "";
  const cities = ["all", ...KZ_CITIES];
  for (const city of cities) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "city-filter";
    button.dataset.city = city;
    button.textContent = city === "all" ? "Все города" : city;
    button.classList.toggle("is-active", city === state.selectedCity);
    button.addEventListener("click", () => {
      state.selectedCity = city;
      renderCityFilterButtons();
      renderCityJobs();
    });
    els.cityFilters.appendChild(button);
  }
}

function filterJobs() {
  const query = state.search.trim().toLowerCase();
  return state.jobs.filter((job) => {
    const sourceMatch = state.sourceId === "all" || job.sourceId === state.sourceId;
    const typeMatch = state.type === "all" || job.type === state.type;
    const text = [job.title, job.company, job.location, job.tags.join(" "), job.description]
      .join(" ")
      .toLowerCase();
    const searchMatch = !query || text.includes(query);

    return sourceMatch && typeMatch && searchMatch;
  });
}

function renderJobs() {
  const filteredJobs = filterJobs().sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  els.vacancyCount.textContent = `${filteredJobs.length} вакансий`;
  renderJobCollection(els.jobList, els.emptyState, filteredJobs, "Ничего не найдено. Измени фильтр или запрос.");
}

function renderTelegramJobs() {
  const telegramJobs = state.jobs
    .filter((job) => String(job.sourceId).startsWith("tg-"))
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  renderJobCollection(
    els.telegramJobList,
    els.telegramEmptyState,
    telegramJobs,
    "Пока нет Telegram-вакансий или не настроен бот.",
  );
}

function renderFavoriteJobs() {
  const favoriteJobs = state.jobs
    .filter((job) => isFavorite(job.id))
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  renderJobCollection(els.favoriteJobList, els.favoriteEmptyState, favoriteJobs, "Пока нет избранных вакансий.");
}

function renderRemoteJobs() {
  const remoteJobs = state.jobs
    .filter((job) => {
      const text = `${job.type || ""} ${job.location || ""} ${job.description || ""}`.toLowerCase();
      return job.type === "remote" || text.includes("удален") || text.includes("remote");
    })
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  renderJobCollection(els.remoteJobList, els.remoteEmptyState, remoteJobs, "Удаленных вакансий не найдено.");
}

function renderCityJobs() {
  const cityAliasMap = {
    Актау: ["актау", "aktau"],
    Мангистау: ["мангистау", "мангыстау", "mangystau", "mangistau", "жанаозен", "zhanaozen"],
  };
  const cityJobs = state.jobs
    .filter((job) => {
      if (state.selectedCity === "all") {
        return true;
      }
      const location = String(job.location || "").toLowerCase();
      const aliases = cityAliasMap[state.selectedCity] || [String(state.selectedCity).toLowerCase()];
      return aliases.some((alias) => location.includes(alias));
    })
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  renderJobCollection(els.cityJobList, els.cityEmptyState, cityJobs, "По выбранному городу вакансий нет.");
}

function renderAllJobSections() {
  renderJobs();
  renderFavoriteJobs();
  renderRemoteJobs();
  renderCityFilterButtons();
  renderCityJobs();
  renderTelegramJobs();
}

function renderAnalytics() {
  const liveSources = sources.filter((source) => source.status === "live").length;
  const catalogSources = sources.filter((source) => source.status === "catalog").length;
  const telegramJobs = state.jobs.filter((job) => String(job.sourceId).startsWith("tg-")).length;

  els.analyticsTotal.textContent = String(state.jobs.length);
  els.analyticsLiveSources.textContent = String(liveSources);
  els.analyticsTelegramJobs.textContent = String(telegramJobs);
  els.analyticsCatalogSources.textContent = String(catalogSources);
}

function renderSections() {
  document.body.dataset.section = state.activeSection;
  for (const tab of els.sectionTabs) {
    tab.classList.toggle("is-active", tab.dataset.section === state.activeSection);
  }
  for (const panel of els.sectionPanels) {
    const isActive = panel.dataset.panel === state.activeSection;
    panel.classList.toggle("hidden", !isActive);
    if (isActive) {
      panel.classList.remove("panel-animate");
      requestAnimationFrame(() => panel.classList.add("panel-animate"));
    } else {
      panel.classList.remove("panel-animate");
    }
  }
}

async function loadJobs() {
  const response = await fetch("/api/jobs");
  if (!response.ok) {
    throw new Error(`API вернул статус ${response.status}`);
  }
  const payload = await response.json();
  state.jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  sources = Array.isArray(payload.sources) ? payload.sources : [];

  const parts = [];
  if (payload.updatedAt) {
    parts.push(`Обновлено: ${formatDate(payload.updatedAt)}`);
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    parts.push(`Ошибки источников: ${payload.errors.join("; ")}`);
  }
  els.statusLine.textContent = parts.join(" | ");
  renderSources();
  renderAllJobSections();
  renderAnalytics();
}

function attachEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAllJobSections();
  });

  els.sourceFilter.addEventListener("change", (event) => {
    state.sourceId = event.target.value;
    renderAllJobSections();
  });

  els.typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderAllJobSections();
  });

  els.refreshBtn.addEventListener("click", async () => {
    els.refreshBtn.disabled = true;
    els.refreshBtn.textContent = "Обновляем...";
    try {
      await loadJobs();
      renderAllJobSections();
    } catch (error) {
      els.statusLine.textContent = `Ошибка загрузки: ${error.message}`;
    }
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = "Обновить";
  });

  for (const tab of els.sectionTabs) {
    tab.addEventListener("click", () => {
      state.activeSection = tab.dataset.section;
      renderSections();
    });
  }

}

async function init() {
  loadFavorites();
  attachEvents();
  try {
    await loadJobs();
    renderAllJobSections();
    renderSections();
  } catch (error) {
    els.statusLine.textContent = `Ошибка загрузки: ${error.message}`;
  }
}

init();
