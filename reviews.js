(function () {
  'use strict';

  const STORAGE_KEY = 'marketCustomerReviews';
  const DEMO_REVIEWS = [];

  const state = { reviews: [], query: '', filter: 'all', source: 'local' };

  const isLocalDevelopment = () => window.location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const getSupabaseRestConfig = () => {
    const config = window.DISNEY_FLOWER_CONFIG || {};
    return { url: config.supabaseUrl || 'https://srpfxplqcigxthzbxseu.supabase.co', key: config.supabaseKey || 'sb_publishable_fNwkuYfrxMnEgj3IToEfgw_RzVpXuoe' };
  };

  const getStoredRestSession = () => {
    try { return JSON.parse(localStorage.getItem('disney-public-auth') || 'null'); } catch { return null; }
  };

  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const initials = (name) => {
    const parts = String(name || 'عميل').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return (parts.map(part => part.charAt(0)).join('') || 'م').toUpperCase();
  };

  const formatDate = (value) => {
    if (!value) return 'تجربة حديثة';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'تجربة حديثة';
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getLocalReviews = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(stored) && stored.length) return stored;
    } catch (error) {
      console.warn('تعذر قراءة التقييمات المحلية', error);
    }
    return [];
  };

  const starsMarkup = (rating) => {
    const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
    return Array.from({ length: 5 }, (_, index) => '<i class="fas fa-star ' + (index < safeRating ? '' : 'empty') + '"></i>').join('');
  };

  const renderStats = () => {
    const count = state.reviews.length;
    const average = count ? state.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count : 0;
    const featured = state.reviews.filter(review => review.is_featured).length;
    document.getElementById('reviewsCount').textContent = count;
    document.getElementById('reviewsAverage').textContent = average.toFixed(1);
    document.getElementById('reviewsFeatured').textContent = featured;
  };

  const renderReviews = () => {
    const grid = document.getElementById('reviewsGrid');
    const empty = document.getElementById('reviewsEmpty');
    if (!grid || !empty) return;

    const query = state.query.trim().toLocaleLowerCase('ar');
    const filtered = state.reviews.filter(review => {
      const haystack = String(review.customer_name || '') + ' ' + String(review.review_text || '');
      const matchesQuery = !query || haystack.toLocaleLowerCase('ar').includes(query);
      const matchesFilter = state.filter === 'all' || Number(review.rating) === Number(state.filter);
      return matchesQuery && matchesFilter;
    });

    grid.innerHTML = filtered.map(review => {
      const featured = review.is_featured ? '<span class="review-featured-label"><i class="fas fa-crown"></i> تجربة مميزة</span>' : '';
      const reply = review.admin_reply ? '<div class="review-admin-reply"><strong><i class="fas fa-reply"></i> رد Disney</strong>' + escapeHtml(review.admin_reply) + '</div>' : '';
      const safeRating = Math.max(0, Math.min(5, Number(review.rating) || 0));
      return '<article class="review-card ' + (review.is_featured ? 'featured' : '') + '">' +
        featured +
        '<div class="review-card-head"><span class="review-avatar">' + escapeHtml(initials(review.customer_name)) + '</span>' +
        '<div><strong class="review-card-name">' + escapeHtml(review.customer_name || 'عميل Disney') + '</strong><span class="review-card-date">' + escapeHtml(formatDate(review.created_at)) + '</span></div>' +
        '<div class="review-card-stars" aria-label="' + safeRating + ' من 5 نجوم"><span class="review-card-stars-icons">' + starsMarkup(safeRating) + '</span><strong class="review-card-rating-text">' + safeRating + '/5</strong></div></div>' +
        '<p class="review-card-text">' + escapeHtml(review.review_text) + '</p>' + reply + '</article>';
    }).join('');

    empty.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
  };

  const render = () => {
    renderStats();
    renderReviews();
  };

  const renderAuthState = () => {
    const prompt = document.getElementById('reviewLoginPrompt');
    const form = document.getElementById('reviewForm');
    const userName = document.getElementById('reviewUserName');
    const userAvatar = document.getElementById('reviewUserAvatar');
    const user = getCurrentUser();

    if (!prompt || !form) return;
    const loggedIn = Boolean(user && (user.id || user.email || user.name));
    prompt.hidden = loggedIn;
    form.hidden = !loggedIn;

    if (loggedIn) {
      const name = user.name || 'عميل Disney';
      userName.textContent = name;
      userAvatar.textContent = initials(name).charAt(0);
    }
  };

  const setStatus = (message, isError) => {
    const status = document.getElementById('reviewFormStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', Boolean(isError));
  };

  const loadReviews = async () => {
    const client = window.supabaseCatalog?.client;
    if (client) {
      try {
        const result = await client
          .from('customer_reviews')
          .select('id,customer_id,customer_name,rating,review_text,is_published,is_featured,admin_reply,created_at,updated_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        if (result.error) throw result.error;
        state.source = 'remote';
        state.reviews = Array.isArray(result.data) ? result.data : [];
        render();
        return;
      } catch (error) {
        console.info('تقييمات Supabase غير متاحة حاليًا.', error.message || error);
        if (!isLocalDevelopment()) {
          state.source = 'remote-error';
          state.reviews = [];
          render();
          setStatus('التقييمات المشتركة غير متاحة حاليًا. حاول تحديث الصفحة بعد قليل.', true);
          return;
        }
      }
    }

    try {
      const config = getSupabaseRestConfig();
      const stored = getStoredRestSession();
      const response = await fetch(config.url + '/rest/v1/customer_reviews?select=id,customer_id,customer_name,rating,review_text,is_published,is_featured,admin_reply,created_at,updated_at&is_published=eq.true&order=created_at.desc', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + (stored?.access_token || config.key) }
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error('Reviews request failed');
      state.source = 'remote';
      state.reviews = Array.isArray(data) ? data : [];
      render();
      return;
    } catch (error) {
      console.info('تقييمات Supabase REST غير متاحة حاليًا.', error.message || error);
    }
    if (!isLocalDevelopment()) {
      state.source = 'remote-error';
      state.reviews = [];
      render();
      setStatus('التقييمات المشتركة تحتاج اتصالًا بقاعدة البيانات.', true);
      return;
    }

    state.source = 'local';
    state.reviews = getLocalReviews().filter(review => review.is_published !== false);
    render();
  };

  const submitReview = async (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      renderAuthState();
      setStatus('سجل دخولك الأول علشان تقدر تبعت تقييم.', true);
      return;
    }

    const rating = Number(document.getElementById('reviewRating').value);
    const text = document.getElementById('reviewText').value.trim();
    if (!rating || rating < 1 || rating > 5) {
      setStatus('اختار عدد النجوم الأول.', true);
      return;
    }
    if (text.length < 10 || text.length > 1000) {
      setStatus('اكتب تقييم من 10 إلى 1000 حرف.', true);
      return;
    }

    const payload = {
      customer_id: String(user.id || user.email || ('local-' + Date.now())),
      customer_name: String(user.name || 'عميل Disney').trim(),
      customer_email: String(user.email || '').trim(),
      rating,
      review_text: text,
      is_published: false,
      is_featured: false,
      admin_reply: '',
      updated_at: new Date().toISOString()
    };

    const form = document.getElementById('reviewForm');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('جاري إرسال تقييمك للمراجعة...', false);

    try {
      const client = window.supabaseCatalog?.client;
      if (client && state.source === 'remote' && user.authProvider === 'supabase') {
        const result = await client.from('customer_reviews').insert(payload);
        if (result.error) throw result.error;
      } else if (state.source === 'remote' && user.authProvider === 'supabase') {
        const config = getSupabaseRestConfig();
        const stored = getStoredRestSession();
        if (!stored?.access_token) throw new Error('لا توجد جلسة دخول صالحة لإرسال التقييم.');
        const response = await fetch(config.url + '/rest/v1/customer_reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal', apikey: config.key, Authorization: 'Bearer ' + stored.access_token },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || data.hint || 'Reviews insert failed');
        }
      } else if (isLocalDevelopment()) {
        const localReviews = getLocalReviews();
        localReviews.unshift({ ...payload, id: 'local-' + Date.now(), created_at: new Date().toISOString() });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localReviews));
      } else {
        throw new Error('Customer reviews require a Supabase account on the hosted site.');
      }

      form.reset();
      setRating(5);
      setStatus('تم إرسال تقييمك، وهيظهر للزوار بعد مراجعته من الإدارة.', false);
      window.dispatchEvent(new CustomEvent('reviews:updated'));
    } catch (error) {
      console.error('تعذر إرسال التقييم', error);
      setStatus('حصلت مشكلة في إرسال التقييم. جرّب مرة تانية بعد قليل.', true);
    } finally {
      submitButton.disabled = false;
    }
  };

  const updateRatingLabel = (rating) => {
    const label = document.getElementById('reviewRatingLabel');
    if (label) label.textContent = 'التقييم: ' + Number(rating) + ' من 5 نجوم';
  };

  const previewRating = (rating) => {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 1));
    document.querySelectorAll('#reviewStars button').forEach(button => {
      button.classList.toggle('preview-active', Number(button.dataset.rating) <= safeRating);
    });
    updateRatingLabel(safeRating);
  };

  const clearRatingPreview = () => {
    const selectedRating = Number(document.getElementById('reviewRating')?.value || 5);
    document.querySelectorAll('#reviewStars button').forEach(button => {
      button.classList.remove('preview-active');
    });
    updateRatingLabel(selectedRating);
  };

  const setRating = (rating) => {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 1));
    const hidden = document.getElementById('reviewRating');
    if (hidden) hidden.value = String(safeRating);
    document.querySelectorAll('#reviewStars button').forEach(button => {
      const active = Number(button.dataset.rating) <= safeRating;
      button.classList.toggle('active', active);
      button.classList.remove('preview-active');
      button.setAttribute('aria-pressed', String(active));
    });
    updateRatingLabel(safeRating);
  };

  const init = () => {
    document.getElementById('reviewLoginBtn')?.addEventListener('click', () => {
      document.getElementById('openAuthBtn')?.click();
    });
    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);
    document.getElementById('reviewsSearch')?.addEventListener('input', event => {
      state.query = event.target.value;
      renderReviews();
    });
    document.getElementById('reviewsFilter')?.addEventListener('change', event => {
      state.filter = event.target.value;
      renderReviews();
    });
    const ratingStars = document.getElementById('reviewStars');
    document.querySelectorAll('#reviewStars button').forEach(button => {
      const rating = Number(button.dataset.rating);
      button.addEventListener('click', () => setRating(rating));
      button.addEventListener('pointerenter', () => previewRating(rating));
      button.addEventListener('focus', () => previewRating(rating));
    });
    ratingStars?.addEventListener('pointerleave', clearRatingPreview);
    ratingStars?.addEventListener('focusout', event => {
      if (!ratingStars.contains(event.relatedTarget)) clearRatingPreview();
    });
    window.addEventListener('auth:changed', renderAuthState);
    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY || event.key === 'currentUser') {
        if (event.key === 'currentUser') renderAuthState();
        loadReviews();
      }
    });
    window.addEventListener('reviews:updated', () => loadReviews());
    renderAuthState();
    setRating(5);
    loadReviews();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
