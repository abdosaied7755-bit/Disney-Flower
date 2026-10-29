(function initLiveEvents() {
  const list = document.getElementById('liveEventsList');
  if (!list) return;

  const getVisitorId = () => {
    const key = 'disney-live-events-visitor-id';
    let value = localStorage.getItem(key);
    if (!value) {
      value = window.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, value);
    }
    return value;
  };
  const visitorId = getVisitorId();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const formatDate = value => new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const getReactionKey = id => `disney-live-event-reaction-${id}`;
  const getReaction = id => localStorage.getItem(getReactionKey(id));

  function eventStatus(event) {
    const now = Date.now();
    const start = new Date(event.start_at).getTime();
    const end = new Date(event.end_at).getTime();
    if (now < start) return { label: 'قادم قريبًا', className: '' };
    if (now <= end) return { label: 'يحدث الآن', className: 'is-live' };
    return { label: 'انتهى الإيفنت', className: 'is-ended' };
  }

  function render(events) {
    if (!events.length) {
      list.innerHTML = '<div class="events-empty"><i class="fas fa-calendar-xmark"></i><p>لا توجد إيفنتات منشورة حاليًا. تابعنا لمعرفة الجديد.</p></div>';
      return;
    }
    list.innerHTML = events.map(event => {
      const status = eventStatus(event);
      const selected = getReaction(event.id);
      const image = String(event.image_url || '').trim();
      const body = escapeHtml(event.body || '').replace(/\r?\n/g, '<br>');
      return `<article class="live-event-card" data-event-id="${escapeHtml(event.id)}">
        <div class="live-event-media${image ? '' : ' is-empty'}">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}" loading="lazy">` : ''}<span class="live-event-status ${status.className}">${status.label}</span></div>
        <div class="live-event-content"><span class="live-event-kicker"><i class="fas fa-calendar-heart"></i> Disney Live Event</span><h2>${escapeHtml(event.title)}</h2><p class="live-event-body">${body}</p>
          <div class="live-event-dates"><div class="live-event-date"><small>يبدأ في</small><strong>${formatDate(event.start_at)}</strong></div><div class="live-event-date"><small>ينتهي في</small><strong>${formatDate(event.end_at)}</strong></div></div>
          <div class="live-event-actions"><div class="live-event-reactions"><button class="live-event-reaction${selected === 'like' ? ' is-selected' : ''}" data-reaction="like" type="button" aria-pressed="${selected === 'like'}"><i class="fas fa-thumbs-up"></i> إعجاب <strong>${Number(event.likes) || 0}</strong></button><button class="live-event-reaction dislike${selected === 'dislike' ? ' is-selected' : ''}" data-reaction="dislike" type="button" aria-pressed="${selected === 'dislike'}"><i class="fas fa-thumbs-down"></i> عدم إعجاب <strong>${Number(event.dislikes) || 0}</strong></button></div><span class="live-event-note">رأيك يساعدنا نجهز الأفضل لك</span></div>
        </div>
      </article>`;
    }).join('');
  }

  async function loadEvents() {
    const client = window.supabaseCatalog?.client;
    if (!client) {
      list.innerHTML = '<div class="events-error">تعذر الاتصال بقاعدة البيانات حاليًا.</div>';
      return;
    }
    const { data, error } = await client.from('live_events').select('*').eq('is_published', true).order('start_at', { ascending: true });
    if (error) {
      list.innerHTML = '<div class="events-error">تعذر تحميل الإيفنتات. تأكد من تشغيل ملف قاعدة البيانات الخاص باللايف إيفنت.</div>';
      console.error(error);
      return;
    }
    render(data || []);
  }

  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-reaction]');
    if (!button) return;
    const card = button.closest('[data-event-id]');
    const client = window.supabaseCatalog?.client;
    if (!card || !client || button.disabled) return;
    const reaction = button.dataset.reaction;
    button.disabled = true;
    const { data, error } = await client.rpc('react_live_event', { p_event_id: card.dataset.eventId, p_visitor_id: visitorId, p_reaction: reaction });
    button.disabled = false;
    if (error) {
      console.error(error);
      return;
    }
    localStorage.setItem(getReactionKey(card.dataset.eventId), reaction);
    const eventData = Array.isArray(data) ? data[0] : data;
    const likeButton = card.querySelector('[data-reaction="like"] strong');
    const dislikeButton = card.querySelector('[data-reaction="dislike"] strong');
    if (likeButton) likeButton.textContent = Number(eventData?.likes) || 0;
    if (dislikeButton) dislikeButton.textContent = Number(eventData?.dislikes) || 0;
    card.querySelectorAll('[data-reaction]').forEach(item => { const active = item.dataset.reaction === reaction; item.classList.toggle('is-selected', active); item.setAttribute('aria-pressed', String(active)); });
  });

  if (window.supabaseCatalog?.ready) window.supabaseCatalog.ready.then(loadEvents);
  else loadEvents();
})();
