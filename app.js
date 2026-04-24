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
const KZ_LOCATION_KEYWORDS = [
  ...KZ_CITIES.map((city) => city.toLowerCase()),
  "казахстан",
  "kазақстан",
  "kz",
  "almaty",
  "astana",
  "aktau",
  "atyrau",
  "karaganda",
  "shymkent",
  "mangystau",
  "mangistau",
  "zhanaozen",
];

const state = {
  jobs: [],

  search: "",
  sourceId: "all",
  type: "all",
  salary: "all",
  specialty: "all",
  city: "all",
  sort: "newest",
  activeSection: "jobs",
  selectedCity: "all",
  favorites: new Set(),
  previousJobIds: new Set(),
  isAutoRefresh: false,
};

const els = {
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  salaryFilter: document.querySelector("#salaryFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  specialtyFilter: document.querySelector("#specialtyFilter"),
  citySmartFilter: document.querySelector("#citySmartFilter"),
  vacancyCount: document.querySelector("#vacancyCount"),
  jobList: document.querySelector("#jobList"),
  favoriteJobList: document.querySelector("#favoriteJobList"),
  remoteJobList: document.querySelector("#remoteJobList"),
  foreignJobList: document.querySelector("#foreignJobList"),
  cityJobList: document.querySelector("#cityJobList"),
  telegramJobList: document.querySelector("#telegramJobList"),
  sourceList: document.querySelector("#sourceList"),
  emptyState: document.querySelector("#emptyState"),
  favoriteEmptyState: document.querySelector("#favoriteEmptyState"),
  remoteEmptyState: document.querySelector("#remoteEmptyState"),
  foreignEmptyState: document.querySelector("#foreignEmptyState"),
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
  telegramSubscribeBox: document.querySelector("#telegramSubscribeBox"),
  telegramSubscribeCommand: document.querySelector("#telegramSubscribeCommand"),
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
  node.querySelector(".job-location").textContent = `Регион: ${job.region || job.location || "Не указан"}`;
  node.querySelector(".job-description").textContent = job.description;
  node.querySelector(".job-date").textContent = `Опубликовано: ${formatDate(job.postedAt)}`;
  const link = node.querySelector(".job-link");
  link.href = job.url;

  let salaryValue = extractSalary(job);
  if (salaryValue) {
    const p = document.createElement("p");
    p.className = "job-salary";
    p.innerHTML = `<strong>💰 Зарплата:</strong> от ${salaryValue.toLocaleString("ru-RU")} ₸`;
    node.querySelector(".job-card").insertBefore(p, node.querySelector(".job-location").nextSibling);
  }

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
  jobs.forEach((job, index) => {
    const cardFragment = buildJobCard(job);
    const card = cardFragment.querySelector(".job-card");
    if (card) {
      // Staggered animation delay
      card.style.animationDelay = `${index * 0.04}s`;
      // Mark new cards
      if (state.isAutoRefresh && !state.previousJobIds.has(job.id)) {
        card.classList.add("is-new");
      }
    }
    targetList.appendChild(cardFragment);
  });
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

function populateSmartFilters() {
  const specialties = [...new Set(state.jobs.map((job) => String(job.specialty || "Other").trim()).filter(Boolean))].sort();
  const cities = [...new Set(state.jobs.map((job) => String(job.city || "").trim()).filter(Boolean))].sort();

  els.specialtyFilter.innerHTML = `<option value="all">Любая специальность</option>`;
  for (const specialty of specialties) {
    const option = document.createElement("option");
    option.value = specialty;
    option.textContent = specialty;
    option.selected = state.specialty === specialty;
    els.specialtyFilter.appendChild(option);
  }

  els.citySmartFilter.innerHTML = `<option value="all">Любой город</option>`;
  for (const city of cities) {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    option.selected = state.city === city;
    els.citySmartFilter.appendChild(option);
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

function extractSalary(job) {
  const text = `${job.title} ${job.description} ${job.salary || ""}`.toLowerCase();
  const match = text.match(/(?:от|до)?\s*(\d{1,3}(?:[ \.,]\d{3})+)\s*(?:тг|kzt|₸|тенге|rub|руб)/i);
  if (match) {
    return parseInt(match[1].replace(/\D/g, ""), 10);
  }
  const match2 = text.match(/(?:от|до)?\s*(\d{2,4})\s*000\s*(?:тг|kzt|₸|тенге|rub|руб)/i);
  if (match2) {
    return parseInt(match2[1] + "000", 10);
  }
  return 0;
}

function filterJobs() {
  const query = state.search.trim().toLowerCase();
  return state.jobs.filter((job) => {
    const sourceMatch = state.sourceId === "all" || job.sourceId === state.sourceId;
    const typeMatch = state.type === "all" || job.type === state.type;
    const specialtyMatch = state.specialty === "all" || String(job.specialty || "Other") === state.specialty;
    const cityMatch = state.city === "all" || String(job.city || "") === state.city;
    const text = [job.title, job.company, job.location, job.tags.join(" "), job.description]
      .join(" ")
      .toLowerCase();
    const searchMatch = !query || text.includes(query);

    let salaryMatch = true;
    if (state.salary !== "all") {
      const minSalary = parseInt(state.salary, 10);
      const jobSalary = extractSalary(job);
      salaryMatch = jobSalary >= minSalary;
    }

    return sourceMatch && typeMatch && specialtyMatch && cityMatch && searchMatch && salaryMatch;
  });
}

function renderJobs() {
  let filteredJobs = filterJobs();
  
  if (state.sort === "newest") {
    filteredJobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  } else if (state.sort === "oldest") {
    filteredJobs.sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt));
  } else if (state.sort === "salary_desc") {
    filteredJobs.sort((a, b) => extractSalary(b) - extractSalary(a));
  } else if (state.sort === "salary_asc") {
    filteredJobs.sort((a, b) => {
      const salA = extractSalary(a);
      const salB = extractSalary(b);
      if (salA === 0) return 1;
      if (salB === 0) return -1;
      return salA - salB;
    });
  }
  els.vacancyCount.textContent = `${filteredJobs.length} вакансий`;
  
  if (state.specialty !== "all" || state.activeSection === "jobs") {
    els.telegramSubscribeBox.classList.remove("hidden");
    const subscribeCat = state.specialty === "all" ? "All" : state.specialty;
    els.telegramSubscribeCommand.textContent = `/subscribe ${subscribeCat}`;
  } else {
    els.telegramSubscribeBox.classList.add("hidden");
  }

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


function renderForeignJobs() {
  const foreignJobs = state.jobs
    .filter((job) => {
      const sourceId = String(job.sourceId || "").toLowerCase();
      if (sourceId.startsWith("tg-")) {
        return false;
      }
      const locationText = `${job.location || ""} ${job.description || ""}`.toLowerCase();
      return !KZ_LOCATION_KEYWORDS.some((keyword) => locationText.includes(keyword));
    })
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

  renderJobCollection(els.foreignJobList, els.foreignEmptyState, foreignJobs, "Иностранных вакансий не найдено.");
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
      const location = String(job.city || job.region || job.location || "").toLowerCase();
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
  renderForeignJobs();
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

  // Track previous job IDs for new card detection
  state.previousJobIds = new Set(state.jobs.map((j) => j.id));

  const newJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  const newCount = state.previousJobIds.size > 0
    ? newJobs.filter((j) => !state.previousJobIds.has(j.id)).length
    : 0;

  state.jobs = newJobs;
  sources = Array.isArray(payload.sources) ? payload.sources : [];

  const parts = [];
  if (payload.updatedAt) {
    parts.push(`Обновлено: ${formatDate(payload.updatedAt)}`);
  }
  if (newCount > 0) {
    parts.push(`+${newCount} новых`);
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    parts.push(`Ошибки источников: ${payload.errors.join("; ")}`);
  }
  els.statusLine.innerHTML = `<span class="live-indicator"><span class="live-dot"></span>LIVE</span> ` + parts.join(" | ");

  renderSources();
  populateSmartFilters();
  renderAllJobSections();
  renderAnalytics();

  // After render, mark as auto-refresh for next cycle
  state.isAutoRefresh = true;
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

  els.specialtyFilter.addEventListener("change", (event) => {
    state.specialty = event.target.value;
    renderAllJobSections();
  });

  els.citySmartFilter.addEventListener("change", (event) => {
    state.city = event.target.value;
    renderAllJobSections();
  });

  els.salaryFilter.addEventListener("change", (event) => {
    state.salary = event.target.value;
    renderAllJobSections();
  });

  els.sortFilter.addEventListener("change", (event) => {
    state.sort = event.target.value;
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

  // Auto-refresh every 60 seconds
  setInterval(async () => {
    try {
      await loadJobs();
    } catch (_e) {
      // Silently retry on next cycle
    }
  }, 60 * 1000);
}

init();

// AI features removed per user request.
