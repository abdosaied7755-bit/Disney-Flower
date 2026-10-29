(function initAdminLiveEvents() {
  const catalog = window.supabaseCatalog;
  const form = document.getElementById('liveEventForm');
  const list = document.getElementById('adminLiveEventList');
  const status = document.getElementById('liveEventStatus');
  if (!catalog || !form || !list || !status) return;

  let editingId = null;
  let events = [];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const formatDate = value => new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const toLocalInput = value => {
    const date = new Date(value);
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  function setStatus(message, error = false) {
    status.textContent = message;
    status.className = error ? 'catalog-status error' : 'catalog-status';
  }

  async function uploadImage(file, fallback) {
    if (!file || !file.size) return fallback;
    const path = `events/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const result = await catalog.client.storage.from('product-images').upload(path, file, { upsert: false });
    if (result.error) throw result.error;
    return catalog.client.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  function resetForm() {
    editingId = null;
    form.reset();
    form.elements.is_published.value = 'true';
    form.querySelector('button[type="submit"]').textContent = 'نشر الإيفنت';
  }

  function render() {
    list.innerHTML = events.map(event => `<div class="catalog-row event-admin-row"><div><strong>${escapeHtml(event.title)}</strong><small>${formatDate(event.start_at)} ← ${formatDate(event.end_at)} · ${event.is_published ? 'منشور' : 'مسودة'} · إعجاب ${Number(event.likes) || 0} / عدم إعجاب ${Number(event.dislikes) || 0}</small></div><div class="catalog-row-actions"><button type="button" data-edit-event="${escapeHtml(event.id)}">تعديل</button><button type="button" data-delete-event="${escapeHtml(event.id)}">حذف</button></div></div>`).join('') || '<p>لا توجد إيفنتات مضافة بعد.</p>';
  }

  async function refresh() {
    const result = await catalog.client.from('live_events').select('*').order('start_at', { ascending: false });
    if (result.error) { setStatus(result.error.message, true); return; }
    events = result.data || [];
    render();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (new Date(values.end_at) <= new Date(values.start_at)) { setStatus('تاريخ النهاية لازم يكون بعد تاريخ البداية.', true); return; }
    let imageUrl;
    try { imageUrl = await uploadImage(values.image_file, String(values.image_url || '').trim()); } catch (error) { setStatus(error.message, true); return; }
    const payload = { title: String(values.title || '').trim(), body: String(values.body || '').trim(), image_url: imageUrl, start_at: new Date(values.start_at).toISOString(), end_at: new Date(values.end_at).toISOString(), is_published: values.is_published === 'true' };
    const request = editingId ? catalog.client.from('live_events').update(payload).eq('id', editingId) : catalog.client.from('live_events').insert(payload);
    const result = await request;
    if (result.error) { setStatus(result.error.message, true); return; }
    setStatus(editingId ? 'تم تعديل الإيفنت.' : 'تم نشر الإيفنت.');
    resetForm();
    await refresh();
  });

  list.addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-event]');
    const deleteButton = event.target.closest('[data-delete-event]');
    if (editButton) {
      const item = events.find(entry => String(entry.id) === String(editButton.dataset.editEvent));
      if (!item) return;
      editingId = item.id;
      form.elements.title.value = item.title;
      form.elements.body.value = item.body || '';
      form.elements.image_url.value = item.image_url || '';
      form.elements.start_at.value = toLocalInput(item.start_at);
      form.elements.end_at.value = toLocalInput(item.end_at);
      form.elements.is_published.value = String(item.is_published);
      form.querySelector('button[type="submit"]').textContent = 'حفظ تعديل الإيفنت';
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (deleteButton && confirm('حذف الإيفنت وكل تفاعلاته؟')) {
      const result = await catalog.client.from('live_events').delete().eq('id', deleteButton.dataset.deleteEvent);
      if (result.error) { setStatus(result.error.message, true); return; }
      setStatus('تم حذف الإيفنت.');
      await refresh();
    }
  });

  document.getElementById('resetLiveEventForm')?.addEventListener('click', resetForm);
  if (catalog.ready) catalog.ready.then(refresh).catch(error => setStatus(error.message, true));
  else refresh();
})();
