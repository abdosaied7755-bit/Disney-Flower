/**
 * AUTH SYSTEM - Registration First Flow
 * Register → Switch to Login → Dashboard
 */

(function() {
  'use strict';

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  let authSubscription = null;
  let authInitialized = false;

  function setup() {
    if (authInitialized) return;
    if (!document.getElementById('authOverlay')) {
      setTimeout(setup, 0);
      return;
    }
    authInitialized = true;
    setupEventListeners();
    subscribeToAuthChanges();
    checkSession();
    // Set register as default tab
    setDefaultTab();
  }

  function setDefaultTab() {
    const registerTab = document.querySelector('[data-tab="register"]');
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    
    if (registerTab && loginTab && registerForm && loginForm) {
      // Ensure register is active
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.classList.remove('active');
      registerForm.classList.add('active');
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Open Modal
    const loginBtn = document.getElementById('openAuthBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', openModal);
    }

    // Close Modal
    const closeBtn = document.getElementById('closeAuthBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // Close on overlay click
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        switchTab(tabName);
      });
    });

    // Forms
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // User Menu
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
      userBtn.addEventListener('click', toggleUserMenu);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('userMenu');
      const userBtn = document.getElementById('userBtn');
      if (userMenu && !userMenu.contains(e.target) && e.target !== userBtn) {
        userMenu.classList.remove('open');
      }
    });
  }

  // Modal
  function openModal() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      clearForms();
      hideAlerts();
      // Always show register first
      setDefaultTab();
    }
  }

  function closeModal() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      clearForms();
      hideAlerts();
    }
  }

  function switchTab(tab) {
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
      loginTab?.classList.add('active');
      registerTab?.classList.remove('active');
      loginForm?.classList.add('active');
      registerForm?.classList.remove('active');
    } else {
      registerTab?.classList.add('active');
      loginTab?.classList.remove('active');
      registerForm?.classList.add('active');
      loginForm?.classList.remove('active');
    }
    
    hideAlerts();
  }

  // Supabase Auth is the only account store; LocalStorage keeps only a non-secret UI session.
  function getSupabaseClient() {
    return window.supabaseCatalog && window.supabaseCatalog.client
      ? window.supabaseCatalog.client
      : null;
  }

  function getSupabaseRestConfig() {
    const config = window.DISNEY_FLOWER_CONFIG || {};
    return {
      url: config.supabaseUrl || 'https://srpfxplqcigxthzbxseu.supabase.co',
      key: config.supabaseKey || 'sb_publishable_fNwkuYfrxMnEgj3IToEfgw_RzVpXuoe'
    };
  }

  function getStoredRestSession() {
    try { return JSON.parse(localStorage.getItem('disney-public-auth') || 'null'); } catch { return null; }
  }

  async function requestSupabaseAuth(path, body, accessToken) {
    const config = getSupabaseRestConfig();
    const response = await fetch(config.url + '/auth/v1/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.key, Authorization: 'Bearer ' + (accessToken || config.key) },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.msg || data.error_description || data.message || 'Supabase auth request failed');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function persistRestSession(authData) {
    const user = authData?.user || authData?.data?.user;
    const accessToken = authData?.access_token || authData?.data?.session?.access_token;
    if (accessToken && user) {
      localStorage.setItem('disney-public-auth', JSON.stringify({ access_token: accessToken, refresh_token: authData.refresh_token || authData.data?.session?.refresh_token || '', user }));
    }
    return user ? persistSupabaseUser(user) : null;
  }

  async function syncRestSession() {
    const stored = getStoredRestSession();
    if (!stored?.access_token || !stored.user) return;
    try {
      const config = getSupabaseRestConfig();
      const response = await fetch(config.url + '/auth/v1/user', { headers: { apikey: config.key, Authorization: 'Bearer ' + stored.access_token } });
      if (!response.ok) throw new Error('Stored auth session expired');
      persistSupabaseUser(await response.json());
    } catch (error) {
      localStorage.removeItem('disney-public-auth');
      localStorage.removeItem('currentUser');
      updateUI(null);
    }
  }


  function supabaseUserToSession(user) {
    const metadata = user && user.user_metadata ? user.user_metadata : {};
    const email = (user && user.email) || '';
    const metadataNames = [metadata.name, metadata.full_name, metadata.fullName, metadata.display_name]
      .filter(value => typeof value === 'string' && value.trim().length >= 2)
      .map(value => value.trim());
    return {
      id: user.id,
      name: metadataNames[0] || email.split('@')[0] || 'المستخدم',
      email,
      createdAt: user.created_at || new Date().toISOString(),
      authProvider: 'supabase'
    };
  }

  function persistSupabaseUser(user) {
    const session = supabaseUserToSession(user);
    localStorage.setItem('currentUser', JSON.stringify(session));
    updateUI(session);
    return session;
  }

  function subscribeToAuthChanges() {
    const client = getSupabaseClient();
    if (!client) { syncRestSession(); return; }
    if (!client || authSubscription) return;
    const result = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        persistSupabaseUser(session.user);
      } else {
        localStorage.removeItem('currentUser');
        updateUI(null);
      }
    });
    authSubscription = result?.data?.subscription || null;
  }
  async function syncSupabaseSession() {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data } = await client.auth.getSession();
      if (data?.session?.user) {
        // Supabase is the source of truth whenever a remote session exists.
        // This also replaces an old localhost user left in localStorage.
        persistSupabaseUser(data.session.user);
        return;
      }

      // Do not keep showing a stale remote account after its session ends.
      const currentUser = getCurrentUser();
      if (currentUser) {
        localStorage.removeItem('currentUser');
        updateUI(null);
      }
      // لا توجد جلسات محلية للحسابات؛ Supabase هو المصدر الوحيد.
    } catch (error) {
      console.warn('Supabase session check failed:', error);
    }
  }

  function getAuthErrorMessage(error, form) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('already registered') || message.includes('already been registered')) {
      return 'هذا البريد مسجل بالفعل! جرّب تسجيل الدخول.';
    }
    if (message.includes('invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
    if (message.includes('email not confirmed')) {
      return 'الحساب ده اتعمل قبل إيقاف Confirm email وما زال غير مؤكد. أكّده من Authentication > Users في Supabase أو احذفه وسجّل بالبريد من جديد.';
    }
    if (message.includes('email logins are disabled') || message.includes('email provider is disabled')) { return 'تسجيل البريد غير مفعّل في Supabase. فعّل Email provider من Authentication > Providers.'; }
    if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
      return 'إنشاء الحسابات متوقف في Supabase. فعّل Allow new users to sign up من إعدادات Authentication.';
    }
    if (message.includes('password') && (message.includes('6') || message.includes('weak'))) {
      return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'تم تجاوز عدد المحاولات. انتظر قليلًا ثم حاول مرة أخرى.';
    }
    return form === 'register'
      ? 'تعذر إنشاء الحساب الآن. تأكد من البيانات وحاول مرة أخرى.'
      : 'تعذر تسجيل الدخول الآن. تأكد من البيانات وحاول مرة أخرى.';
  }

  // Register
  async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || name.length < 2) {
      showAlert('register', 'error', 'الرجاء إدخال اسم صحيح (حرفين على الأقل)');
      return;
    }
    if (!validateEmail(email)) {
      showAlert('register', 'error', 'الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }
    if (!password || password.length < 6) {
      showAlert('register', 'error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const client = getSupabaseClient();
      const result = client
        ? await client.auth.signUp({ email, password, options: { data: { name } } })
        : await requestSupabaseAuth('signup', { email, password, data: { name } });
      if (result.error) throw result.error;
      const authData = client ? result.data : result;
      const user = authData?.user;
      const session = authData?.session || authData;
      if (session?.access_token && user) {
        if (client) persistSupabaseUser(user); else persistRestSession(result);
        e.target.reset();
        closeModal();
        showToast('تم إنشاء حسابك وتسجيل الدخول بنجاح ✓');
      } else {
        showAlert('register', 'success', 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.');
      }
    } catch (error) {
      showAlert('register', 'error', getAuthErrorMessage(error, 'register'));
    }
  }

  // Login
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmail(email)) {
      showAlert('login', 'error', 'الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }
    if (!password) {
      showAlert('login', 'error', 'الرجاء إدخال كلمة المرور');
      return;
    }

    try {
      const client = getSupabaseClient();
      const result = client
        ? await client.auth.signInWithPassword({ email, password })
        : await requestSupabaseAuth('token?grant_type=password', { email, password });
      if (result.error) throw result.error;
      const authData = client ? result.data : result;
      const session = client ? persistSupabaseUser(authData.user) : persistRestSession(result);
      closeModal();
      showToast('مرحباً ' + session.name + '! تم تسجيل الدخول بنجاح ✓');
    } catch (error) {
      showAlert('login', 'error', getAuthErrorMessage(error, 'login'));
    }
  }

  // Logout
  async function handleLogout(e) {
    if (e) e.preventDefault();
    const currentUser = getCurrentUser();
    const client = getSupabaseClient();
    if (client && currentUser?.authProvider === 'supabase') {
      try { await client.auth.signOut(); } catch (error) { console.warn('Supabase logout failed:', error); }
    }
    localStorage.removeItem('disney-public-auth');
    localStorage.removeItem('currentUser');
    updateUI(null);
    showToast('تم تسجيل الخروج بنجاح. نتمنى رؤيتك قريباً');
    if (window.location.pathname.includes('dashboard')) {
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    }
  }

  function checkSession() {
    const currentUser = getCurrentUser();
    updateUI(currentUser);
    syncSupabaseSession();
  }

  function getCurrentUser() {
    try {
      const data = localStorage.getItem('currentUser');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      localStorage.removeItem('currentUser');
      return null;
    }
  }


  // UI Update
  function updateUI(user) {
    const loginBtn = document.getElementById('openAuthBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) userMenu.classList.add('active');
      if (userName) userName.textContent = user.name;
      if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
    } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      if (userMenu) userMenu.classList.remove('active');
    }
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: user }));
  }

  function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
      userMenu.classList.toggle('open');
    }
  }

  // Helpers
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showAlert(form, type, message) {
    const alertId = form + 'Alert';
    const alert = document.getElementById(alertId);
    
    if (alert) {
      alert.className = `alert alert-${type} show`;
      alert.textContent = message;
    }
  }

  function hideAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
      alert.classList.remove('show');
    });
  }

  function clearForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
  }

  function showToast(message) {
    // Toast is disabled - do nothing
    // Comment out to hide all toast notifications
    return;
  }

  // Public API
  window.AuthSystem = {
    getCurrentUser: getCurrentUser,
    isLoggedIn: () => getCurrentUser() !== null,
    logout: handleLogout
  };

  // Start
  init();

})();
