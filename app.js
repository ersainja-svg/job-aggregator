let sources = [];

const state = {
  jobs: [],
  search: "",
  sourceId: "all",
  type: "all",
};

const els = {
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  vacancyCount: document.querySelector("#vacancyCount"),
  jobList: document.querySelector("#jobList"),
  sourceList: document.querySelector("#sourceList"),
  emptyState: document.querySelector("#emptyState"),
  refreshBtn: document.querySelector("#refreshBtn"),
  cardTpl: document.querySelector("#jobCardTemplate"),
  statusLine: document.querySelector("#statusLine"),
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
  els.jobList.innerHTML = "";
  els.vacancyCount.textContent = `${filteredJobs.length} вакансий`;

  if (!filteredJobs.length) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");
  for (const job of filteredJobs) {
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

    const tagsContainer = node.querySelector(".job-tags");
    for (const tag of job.tags) {
      const tagNode = document.createElement("span");
      tagNode.className = "tag";
      tagNode.textContent = tag;
      tagsContainer.appendChild(tagNode);
    }

    els.jobList.appendChild(node);
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
}

function attachEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderJobs();
  });

  els.sourceFilter.addEventListener("change", (event) => {
    state.sourceId = event.target.value;
    renderJobs();
  });

  els.typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    renderJobs();
  });

  els.refreshBtn.addEventListener("click", async () => {
    els.refreshBtn.disabled = true;
    els.refreshBtn.textContent = "Обновляем...";
    try {
      await loadJobs();
      renderJobs();
    } catch (error) {
      els.statusLine.textContent = `Ошибка загрузки: ${error.message}`;
    }
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = "Обновить";
  });
}

async function init() {
  attachEvents();
  try {
    await loadJobs();
    renderJobs();
  } catch (error) {
    els.statusLine.textContent = `Ошибка загрузки: ${error.message}`;
  }
}

init();
