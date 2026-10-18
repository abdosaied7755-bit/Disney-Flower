(function () {
  'use strict';

  const STORAGE_KEY = 'marketCustomerReviews';
  const state = { reviews: [], editingId: null, source: 'local' };
  const form = document.getElementById('adminReviewForm');
  const list = document.getElementById('adminReviewList');
  const status = document.getElementById('reviewsAdminStatus');

  if (!form || !list) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatDate = (value) => {
    if (!value) return 'بدون تاريخ';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'بدون تاريخ' : date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const setStatus = (message, isError) => {
    if (!status) return;
    status.textContent = message;
    status.className = 'reviews-admin-status' + (isError ? ' error' : '');
  };

  const getLocalReviews = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      return [];
    }
  };

  const saveLocalReviews = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews));

  const getAuthenticatedClient = async () => {
    const client = window.supabaseCatalog?.client;
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      return data?.session ? client : null;
    } catch (error) {
      return null;
    }
  };

  const loadReviews = async () => {
    const client = await getAuthenticatedClient();
    if (client) {
      try {
        const result = await client.from('customer_reviews').select('*').order('created_at', { ascending: false });
        if (result.error) throw result.error;
        state.source = 'remote';
        state.reviews = Array.isArray(result.data) ? result.data : [];
        render();
        setStatus('تم تحميل التقييمات من Supabase.', false);
        return;
      } catch (error) {
        console.info('تعذر تحميل جدول customer_reviews', error.message || error);
        setStatus('الجدول غير متاح أو الحساب غير مصرح. شغّل ملف supabase-catalog-schema.sql ثم سجل دخول Supabase للإدارة.', true);
      }
    }

    state.source = 'local';
    state.reviews = getLocalReviews();
    render();
  };

  const render = () => {
    if (!state.reviews.length) {
      list.innerHTML = '<div class="catalog-empty">لا توجد تقييمات حتى الآن.</div>';
      return;
    }

    list.innerHTML = state.reviews.map(review => {
      const published = review.is_published !== false;
      const featured = review.is_featured === true;
      const stars = '★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)));
      return '<div class="catalog-row admin-review-row">' +
        '<div class="admin-review-row-main"><div class="admin-review-row-heading"><strong>' + escapeHtml(review.customer_name || 'عميل') + '</strong><span class="admin-review-rating">' + stars + '<small>/5</small></span></div>' +
        '<p>' + escapeHtml(review.review_text || '') + '</p><small>' + (published ? 'منشور' : 'قيد المراجعة') + (featured ? ' • مميز' : '') + ' • ' + escapeHtml(formatDate(review.created_at)) + '</small></div>' +
        '<div class="catalog-row-actions"><button type="button" data-review-action="edit" data-review-id="' + escapeHtml(review.id) + '">تعديل</button><button type="button" data-review-action="delete" data-review-id="' + escapeHtml(review.id) + '">حذف</button></div></div>';
    }).join('');
  };

  const resetForm = () => {
    state.editingId = null;
    form.reset();
    form.elements.rating.value = '5';
    form.elements.is_published.value = 'true';
    form.elements.is_featured.value = 'false';
    document.getElementById('adminReviewFormTitle').textContent = 'إضافة تقييم جديد';
    document.getElementById('adminReviewSubmit').textContent = 'إضافة التقييم';
    document.getElementById('adminReviewReset').textContent = 'تفريغ';
  };

  const fillForm = (review) => {
    state.editingId = review.id;
    form.elements.customer_name.value = review.customer_name || '';
    form.elements.customer_email.value = review.customer_email || '';
    form.elements.rating.value = String(review.rating || 5);
    form.elements.review_text.value = review.review_text || '';
    form.elements.is_published.value = String(review.is_published !== false);
    form.elements.is_featured.value = String(review.is_featured === true);
    form.elements.admin_reply.value = review.admin_reply || '';
    document.getElementById('adminReviewFormTitle').textContent = 'تعديل التقييم';
    document.getElementById('adminReviewSubmit').textContent = 'حفظ التعديلات';
    document.getElementById('adminReviewReset').textContent = 'إلغاء التعديل';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveReview = async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const name = String(values.get('customer_name') || '').trim();
    const text = String(values.get('review_text') || '').trim();
    if (name.length < 2) {
      setStatus('اكتب اسم العميل بشكل صحيح.', true);
      return;
    }
    if (text.length < 10 || text.length > 1000) {
      setStatus('نص التقييم لازم يكون من 10 إلى 1000 حرف.', true);
      return;
    }

    const current = state.reviews.find(review => String(review.id) === String(state.editingId));
    const payload = {
      customer_id: current?.customer_id || ('admin-' + Date.now()),
      customer_name: name,
      customer_email: String(values.get('customer_email') || '').trim(),
      rating: Number(values.get('rating') || 5),
      review_text: text,
      is_published: values.get('is_published') === 'true',
      is_featured: values.get('is_featured') === 'true',
      admin_reply: String(values.get('admin_reply') || '').trim(),
      updated_at: new Date().toISOString()
    };

    const submitButton = document.getElementById('adminReviewSubmit');
    submitButton.disabled = true;
    setStatus(state.editingId ? 'جاري حفظ التعديلات...' : 'جاري إضافة التقييم...', false);

    try {
      const client = window.supabaseCatalog?.client;
      if (client && state.source === 'remote') {
        if (state.editingId) {
          const result = await client.from('customer_reviews').update(payload).eq('id', state.editingId);
          if (result.error) throw result.error;
        } else {
          const result = await client.from('customer_reviews').insert(payload);
          if (result.error) throw result.error;
        }
        await loadReviews();
      } else {
        const localItem = {
          ...payload,
          id: state.editingId || ('local-' + Date.now()),
          created_at: current?.created_at || new Date().toISOString()
        };
        if (state.editingId) {
          state.reviews = state.reviews.map(review => String(review.id) === String(state.editingId) ? localItem : review);
        } else {
          state.reviews.unshift(localItem);
        }
        saveLocalReviews();
        render();
        window.dispatchEvent(new CustomEvent('reviews:updated'));
        setStatus('تم حفظ التقييم محليًا.', false);
      }
      resetForm();
    } catch (error) {
      console.error('تعذر حفظ التقييم', error);
      setStatus('تعذر حفظ التقييم. تأكد من تسجيل دخول Supabase ومن تشغيل ملف schema.', true);
    } finally {
      submitButton.disabled = false;
    }
  };

  const deleteReview = async (id) => {
    const review = state.reviews.find(item => String(item.id) === String(id));
    if (!review || !window.confirm('حذف تقييم ' + (review.customer_name || 'العميل') + '؟')) return;
    try {
      const client = window.supabaseCatalog?.client;
      if (client && state.source === 'remote') {
        const result = await client.from('customer_reviews').delete().eq('id', id);
        if (result.error) throw result.error;
        await loadReviews();
      } else {
        state.reviews = state.reviews.filter(item => String(item.id) !== String(id));
        saveLocalReviews();
        render();
        window.dispatchEvent(new CustomEvent('reviews:updated'));
        setStatus('تم حذف التقييم.', false);
      }
      if (String(state.editingId) === String(id)) resetForm();
    } catch (error) {
      console.error('تعذر حذف التقييم', error);
      setStatus('تعذر حذف التقييم. تأكد من صلاحيات المدير.', true);
    }
  };

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-review-action]');
    if (!button) return;
    const id = button.dataset.reviewId;
    if (button.dataset.reviewAction === 'edit') {
      const review = state.reviews.find(item => String(item.id) === String(id));
      if (review) fillForm(review);
    } else if (button.dataset.reviewAction === 'delete') {
      deleteReview(id);
    }
  });

  form.addEventListener('submit', saveReview);
  document.getElementById('adminReviewReset')?.addEventListener('click', resetForm);
  window.addEventListener('admin:authenticated', loadReviews);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) loadReviews();
  });

  resetForm();
  loadReviews();
})();
