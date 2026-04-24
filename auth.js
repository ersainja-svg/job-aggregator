// Auth Logic
const authModal = document.getElementById('authModal');
const authBtn = document.getElementById('authBtn');
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
  
  if (token && email) {
    authContainer.innerHTML = `<span class="auth-user-email">${email}</span> <button id="logoutBtn" type="button">Выйти</button>`;
    if (cabinetTab) cabinetTab.style.display = 'block';
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('workflow_token');
      localStorage.removeItem('workflow_email');
      updateAuthUI();
      // Go to main tab if they were on cabinet
      if (document.body.dataset.section === 'cabinet') {
        document.querySelector('.section-tab[data-section="jobs"]').click();
      }
    });
  } else {
    authContainer.innerHTML = `<button id="authBtn" type="button">Войти / Регистрация</button>`;
    if (cabinetTab) cabinetTab.style.display = 'none';
    
    document.getElementById('authBtn').addEventListener('click', () => {
      authModal.classList.remove('hidden');
    });
  }
}

// Initial UI check
updateAuthUI();

closeModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
  authStatus.className = 'form-status';
});

authToggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  authStatus.className = 'form-status';
  
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

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  
  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
  
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
    authStatus.textContent = err.message;
    authStatus.className = 'form-status error show';
  }
});

// Update cabinet logic to use token and proper encoding
const resForm = document.querySelector('#resumeForm');
const vacForm = document.querySelector('#vacancyForm');
const rsStatus = document.querySelector('#resumeStatus');
const vacStatus = document.querySelector('#vacancyStatus');

if(resForm) {
  resForm.addEventListener('submit', async(e)=>{
    e.preventDefault();
    const token = localStorage.getItem('workflow_token');
    if (!token) return alert('Пожалуйста, авторизуйтесь');
    
    try {
      const payload = {
        name: document.getElementById('resumeName').value,
        specialty: document.getElementById('resumeSpecialty').value,
        experience: document.getElementById('resumeExp').value,
        salary: document.getElementById('resumeSalary').value,
        skills: document.getElementById('resumeSkills').value
      };
      const res = await fetch('/api/cabinet/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        rsStatus.textContent = 'Резюме опубликовано!';
        rsStatus.className = 'form-status show';
        resForm.reset();
        setTimeout(() => rsStatus.className = 'form-status', 3000);
      } else throw new Error();
    } catch(e) {
      rsStatus.textContent = 'Ошибка публикации';
      rsStatus.className = 'form-status error show';
    }
  });
}

if(vacForm) {
  vacForm.addEventListener('submit', async(e)=>{
    e.preventDefault();
    const token = localStorage.getItem('workflow_token');
    if (!token) return alert('Пожалуйста, авторизуйтесь');
    
    try {
      const payload = {
        company: document.getElementById('vacCompany').value,
        title: document.getElementById('vacTitle').value,
        location: document.getElementById('vacLocation').value,
        salary: document.getElementById('vacSalary').value,
        description: document.getElementById('vacDescription').value,
        url: document.getElementById('vacUrl').value
      };
      const res = await fetch('/api/cabinet/vacancy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        vacStatus.textContent = 'Вакансия опубликована!';
        vacStatus.className = 'form-status show';
        vacForm.reset();
        setTimeout(() => vacStatus.className = 'form-status', 3000);
        document.getElementById('refreshBtn').click();
      } else throw new Error();
    } catch(e) {
      vacStatus.textContent = 'Ошибка публикации';
      vacStatus.className = 'form-status error show';
    }
  });
}
