/**
 * Supabase Auth integration for the static GitHub Pages storefront.
 * Passwords are handled by Supabase Auth and are never stored in localStorage.
 */
(function initAuthSystem() {
  'use strict';

  const LEGACY_USERS_KEY = 'users';
  const CURRENT_USER_KEY = 'currentUser';
  let initialized = false;
  const getClient = () => window.supabaseCatalog?.client || null;
  const getName = user => user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'المستخدم';
  const getSafeUser = user => user ? ({ id: user.id, name: getName(user), email: user.email || '', createdAt: user.created_at || new Date().toISOString() }) : null;

  function setup() {
    if (initialized || !document.getElementById('authOverlay')) return;
    initialized = true;
    localStorage.removeItem(LEGACY_USERS_KEY);
    setupEventListeners();
    switchTab('register');
    syncSession();
  }

  function setupEventListeners() {
    document.getElementById('openAuthBtn')?.addEventListener('click', openModal);
    document.getElementById('closeAuthBtn')?.addEventListener('click', closeModal);
    document.getElementById('authOverlay')?.addEventListener('click', event => { if (event.target.id === 'authOverlay') closeModal(); });
    document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);
    document.getElementById('userBtn')?.addEventListener('click', toggleUserMenu);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.addEventListener('click', event => {
      const userMenu = document.getElementById('userMenu');
      const userBtn = document.getElementById('userBtn');
      if (userMenu && !userMenu.contains(event.target) && event.target !== userBtn) userMenu.classList.remove('open');
    });
  }

  function openModal() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    clearAuthForms();
    hideAlerts();
    switchTab('register');
  }

  function closeModal() {
    const overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    clearAuthForms();
    hideAlerts();
  }

  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.querySelector('[data-tab="login"]')?.classList.toggle('active', isLogin);
    document.querySelector('[data-tab="register"]')?.classList.toggle('active', !isLogin);
    document.getElementById('loginForm')?.classList.toggle('active', isLogin);
    document.getElementById('registerForm')?.classList.toggle('active', !isLogin);
    hideAlerts();
  }

  async function handleRegister(event) {
    event.preventDefault();
    const client = getClient();
    const name = document.getElementById('registerName')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('registerPassword')?.value || '';
    if (!client) return showAlert('register', 'error', 'خدمة الحساب غير متاحة حاليًا. حاول مرة أخرى.');
    if (!name || name.length < 2) return showAlert('register', 'error', 'الرجاء إدخال اسم صحيح (حرفين على الأقل)');
    if (!validateEmail(email)) return showAlert('register', 'error', 'الرجاء إدخال بريد إلكتروني صحيح');
    if (password.length < 6) return showAlert('register', 'error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setFormBusy(event.currentTarget, true);
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { name } } });
    setFormBusy(event.currentTarget, false);
    if (error) return showAlert('register', 'error', formatAuthError(error));

    if (data.session) {
      closeModal();
      showToast(`تم تسجيلك بنجاح يا ${name}`);
    } else {
      showAlert('register', 'success', 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.');
      event.currentTarget.reset();
      window.setTimeout(() => switchTab('login'), 1800);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const client = getClient();
    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('loginPassword')?.value || '';
    if (!client) return showAlert('login', 'error', 'خدمة الحساب غير متاحة حاليًا. حاول مرة أخرى.');
    if (!validateEmail(email)) return showAlert('login', 'error', 'الرجاء إدخال بريد إلكتروني صحيح');
    if (!password) return showAlert('login', 'error', 'الرجاء إدخال كلمة المرور');

    setFormBusy(event.currentTarget, true);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setFormBusy(event.currentTarget, false);
    if (error) return showAlert('login', 'error', formatAuthError(error));
    persistUser(data.user);
    closeModal();
    showToast(`مرحباً ${getName(data.user)}! تم تسجيل الدخول بنجاح`);
  }

  async function handleLogout(event) {
    event?.preventDefault();
    const client = getClient();
    if (client) await client.auth.signOut();
    localStorage.removeItem(CURRENT_USER_KEY);
    updateUI(null);
    document.getElementById('userMenu')?.classList.remove('open');
  }

  async function syncSession() {
    const client = getClient();
    if (!client) return updateUI(null);
    const { data } = await client.auth.getSession();
    updateFromAuthUser(data.session?.user || null);
    client.auth.onAuthStateChange((_event, session) => updateFromAuthUser(session?.user || null));
  }

  function updateFromAuthUser(user) {
    if (user) persistUser(user);
    else localStorage.removeItem(CURRENT_USER_KEY);
    updateUI(getSafeUser(user));
  }

  function persistUser(user) {
    const safeUser = getSafeUser(user);
    if (safeUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null'); } catch { return null; }
  }

  function updateUI(user) {
    const loginBtn = document.getElementById('openAuthBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      userMenu?.classList.add('active');
      if (userName) userName.textContent = user.name;
      if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
    } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      userMenu?.classList.remove('active');
    }
  }

  function toggleUserMenu() { document.getElementById('userMenu')?.classList.toggle('open'); }
  function clearAuthForms() { document.getElementById('registerFormElement')?.reset(); document.getElementById('loginFormElement')?.reset(); }
  function setFormBusy(form, busy) { form?.querySelector('button[type="submit"]')?.toggleAttribute('disabled', busy); }
  function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ''); }

  function formatAuthError(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('email not confirmed')) return 'أكد بريدك الإلكتروني أولًا ثم حاول تسجيل الدخول.';
    if (message.includes('already registered') || message.includes('user already registered')) return 'هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.';
    if (message.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    return error?.message || 'حدث خطأ. حاول مرة أخرى.';
  }

  function showAlert(form, type, message) {
    const alert = document.getElementById(`${form}Alert`);
    if (!alert) return;
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
  }

  function hideAlerts() { document.querySelectorAll('#registerAlert, #loginAlert').forEach(alert => alert.classList.remove('show')); }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    window.setTimeout(() => { toast.style.display = 'none'; }, 2600);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('#openAuthBtn')) { setup(); openModal(); }
  });

  window.AuthSystem = { getCurrentUser, isLoggedIn: () => Boolean(getCurrentUser()), logout: handleLogout, init: setup };
  window.addEventListener('store:footer-ready', setup);
  window.setTimeout(setup, 500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();