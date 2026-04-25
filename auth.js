// Auth & Cabinet Logic
const authModal = document.getElementById('authModal');
const closeModal = document.querySelector('.close-modal');
const authForm = document.getElementById('authForm');
const authStatus = document.getElementById('authStatus');
const authToggleLink = document.getElementById('authToggleLink');
const authToggleText = document.getElementById('authToggleText');
const authModalTitle = document.getElementById('authModalTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const cabinetTab = document.querySelector('.section-tab[data-section="cabinet"]');
const authContainer = document.getElementById('authContainer');

let isLoginMode = true;

function updateAuthUI() {
  const token = localStorage.getItem('workflow_token');
  const email = localStorage.getItem('workflow_email');

  // Cabinet always visible
  if (cabinetTab) cabinetTab.style.display = 'inline-flex';

  if (token && email) {
    authContainer.innerHTML = `
      <span class="auth-user-email">${email}</span>
      <button id="logoutBtn" type="button">Выйти</button>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('workflow_token');
        localStorage.removeItem('workflow_email');
        updateAuthUI();
      });
    }
  } else {
    authContainer.innerHTML = `<button id="authBtnNew" type="button">Войти / Регистрация</button>`;
    const authBtnNew = document.getElementById('authBtnNew');
    if (authBtnNew) {
      authBtnNew.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      authBtnNew.style.border = 'none';
      authBtnNew.style.color = '#fff';
      authBtnNew.style.fontWeight = '600';
      authBtnNew.addEventListener('click', () => {
        authModal.classList.remove('hidden');
      });
    }
  }
}

// Initial UI
updateAuthUI();

// Close modal
if (closeModal) {
  closeModal.addEventListener('click', () => {
    authModal.classList.add('hidden');
    if (authStatus) authStatus.className = 'form-status';
  });
}

// Toggle login/register
if (authToggleLink) {
  authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (authStatus) authStatus.className = 'form-status';

    if (isLoginMode) {
      authModalTitle.textContent = 'Вход';
      authSubmitBtn.textContent = 'Войти';
      authToggleText.textContent = 'Нет аккаунта?';
      authToggleLink.textContent = 'Зарегистрироваться';
    } else {
      authModalTitle.textContent = 'Регистрация';
      authSubmitBtn.textContent = 'Создать аккаунт';
      authToggleText.textContent = 'Уже есть аккаунт?';
      authToggleLink.textContent = 'Войти';
    }
  });
}

// Auth form submit
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = '...';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('workflow_token', data.token);
        localStorage.setItem('workflow_email', data.email);
        authModal.classList.add('hidden');
        authForm.reset();
        updateAuthUI();
      } else {
        throw new Error(data.error || 'Ошибка авторизации');
      }
    } catch (err) {
      if (authStatus) {
        authStatus.textContent = err.message;
        authStatus.className = 'form-status error show';
      }
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт';
    }
  });
}

// ─── Helper: get auth headers ───
function getAuthHeaders() {
  const token = localStorage.getItem('workflow_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ─── Helper: show status ───
function showStatus(el, message, isError) {
  if (!el) return;
  el.textContent = message;
  el.className = 'form-status ' + (isError ? 'error ' : '') + 'show';
  setTimeout(() => { if (el) el.className = 'form-status'; }, 4000);
}

// ─── Resume form ───
const resForm = document.querySelector('#resumeForm');
const rsStatus = document.querySelector('#resumeStatus');

if (resForm) {
  resForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = resForm.querySelector('button[type="submit"]');

    const name = document.getElementById('resumeName').value.trim();
    const specialty = document.getElementById('resumeSpecialty').value.trim();

    if (!name || !specialty) {
      showStatus(rsStatus, 'Заполните имя и специальность', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Публикация...';

    try {
      const payload = {
        name,
        specialty,
        experience: document.getElementById('resumeExp').value.trim() || '0',
        salary: document.getElementById('resumeSalary').value.trim() || '',
        skills: document.getElementById('resumeSkills').value.trim() || '',
        contact: document.getElementById('resumeContact').value.trim() || ''
      };

      const res = await fetch('/api/cabinet/resume', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showStatus(rsStatus, '✅ Резюме опубликовано!', false);
        resForm.reset();
      } else {
        throw new Error(data.error || 'Ошибка сервера');
      }
    } catch (err) {
      showStatus(rsStatus, '❌ ' + (err.message || 'Ошибка публикации'), true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Опубликовать резюме';
    }
  });
}

// ─── Vacancy form ───
const vacForm = document.querySelector('#vacancyForm');
const vacStatus = document.querySelector('#vacancyStatus');

if (vacForm) {
  vacForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = vacForm.querySelector('button[type="submit"]');

    const title = document.getElementById('vacTitle').value.trim();

    if (!title) {
      showStatus(vacStatus, 'Заполните название должности', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Публикация...';

    try {
      const payload = {
        company: document.getElementById('vacCompany').value.trim() || 'Не указано',
        title,
        location: document.getElementById('vacLocation').value.trim() || 'Казахстан',
        salary: document.getElementById('vacSalary').value.trim() || '',
        description: document.getElementById('vacDescription').value.trim() || '',
        url: document.getElementById('vacUrl').value.trim() || '#'
      };

      const res = await fetch('/api/cabinet/vacancy', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showStatus(vacStatus, '✅ Вакансия опубликована! Появится в ленте через несколько секунд.', false);
        vacForm.reset();
        // Вакансия уже добавлена в кэш на сервере — следующий авторефреш покажет её
      } else {
        throw new Error(data.error || 'Ошибка сервера');
      }
    } catch (err) {
      showStatus(vacStatus, '❌ ' + (err.message || 'Ошибка публикации'), true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Опубликовать вакансию';
    }
  });
}
