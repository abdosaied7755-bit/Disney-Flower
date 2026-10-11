(function initStoreChatbotModule() {
  window.initializeStoreChatbot = function initializeStoreChatbot() {
    const chatToggle = document.querySelector('.chat-toggle');
    const chatWidget = document.querySelector('.chat-widget');
    const chatClose = document.querySelector('.chat-close');
    const chatClear = document.querySelector('.chat-clear');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatMessages');
    if (!chatToggle || !chatWidget || !chatMessages || chatWidget.dataset.storeChatReady) return;
    chatWidget.dataset.storeChatReady = 'true';

    let catalog = [];
    let isReplying = false;
    const maxMessageLength = 240;
    const normalize = value => String(value || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').trim();
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const refreshCatalog = () => { catalog = Array.isArray(window.marketCategories) ? window.marketCategories : []; };
    refreshCatalog();
    window.addEventListener('catalog:updated', refreshCatalog);

    const quickButtons = () => `<div class="chat-quick-buttons"><button class="chat-btn" data-store-action="categories">الأقسام</button><button class="chat-btn" data-store-action="prices">أسعار المنتجات</button><button class="chat-btn" data-store-action="delivery">التوصيل</button><button class="chat-btn" data-store-action="payment">الدفع</button></div>`;
    const categoryButtons = () => `<div class="chat-quick-buttons">${catalog.slice(0, 8).map(category => `<button class="chat-btn" data-store-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('')}</div>`;
    const money = value => `${Number(value || 0).toLocaleString('ar-EG')} جنيه`;

    function productsText(category) {
      const products = (category.products || []).slice(0, 8);
      if (!products.length) return `قسم ${category.name} لسه مفيهوش منتجات مضافة، بس هننزّل فيه قريب 😊`;
      return `دي أشهر منتجات ${category.name} عندنا 👇<br>${products.map(product => `• ${escapeHtml(product.name)} - <strong>${money(product.price)}</strong> (${escapeHtml(product.unit)})`).join('<br>')}<br><br>عايز تعرف منتج معين؟ اكتب اسمه وأنا أقولك سعره فورًا.`;
    }

    function generateResponse(message) {
      const msg = normalize(message);
      if (msg.match(/سلام|هاي|هلا|مرحب|صباح|مساء|اهلا/)) return [`أهلاً بيك يا قمر! 😊 أنا مساعد Market Online. أساعدك تختار طلبك وتعرف الأسعار والتوصيل.`, quickButtons()];
      if (msg.match(/توصيل|دليفري|يوصل|مكان|منطقه|وقت وصول|مواعيد/)) return ['بنوصّل طلبك لحد باب البيت بسرعة 🚚<br>غالبًا التوصيل بيكون خلال 45 لـ 60 دقيقة، والدفع عند الاستلام متاح. ابعتلنا منطقتك ونأكدلك التفاصيل 😊', quickButtons()];
      if (msg.match(/دفع|فودافون|كاش|فيزا|استلام|انستاباي/)) return ['الدفع سهل يا باشا 💳<br>متاح الدفع عند الاستلام، وكمان نقدر ننسق معاك طريقة الدفع المناسبة وقت تأكيد الطلب.', quickButtons()];
      if (msg.match(/قسم|اقسام|اصناف|فئات|موجود|كتالوج/)) return [`عندنا ${catalog.length} أقسام متاحة دلوقتي 👇<br>${catalog.map(category => `• ${escapeHtml(category.name)} (${category.products?.length || 0} منتج)`).join('<br>') || 'بنحدّث الأقسام حاليًا، جرب كمان شوية.'}`, categoryButtons()];
      if (msg.match(/سعر|كام|اسعار|ثمن|بكام/)) return ['أكيد! اختار القسم أو اكتب اسم المنتج وأنا أقولك السعر والوحدة على طول 👇', categoryButtons()];
      if (msg.match(/شكرا|تسلم|ممتاز|جميل|تمام/)) return ['العفو يا جميل! 😊 أي خدمة تانية أنا تحت أمرك.', quickButtons()];

      const category = catalog.find(item => msg.includes(normalize(item.name)) || msg === normalize(item.id));
      if (category) return [productsText(category), categoryButtons()];
      const match = catalog.flatMap(item => (item.products || []).map(product => ({ product, category: item }))).find(item => msg.includes(normalize(item.product.name)) || normalize(item.product.name).includes(msg));
      if (match) return [`${escapeHtml(match.product.name)} موجود في قسم ${escapeHtml(match.category.name)} 😊<br>السعر: <strong>${money(match.product.price)}</strong><br>الوحدة: ${escapeHtml(match.product.unit)}<br><br>تحب تضيفه للسلة؟`, `<div class="chat-quick-buttons"><a class="chat-btn" href="game-detail.html?category=${encodeURIComponent(match.category.id)}&product=${encodeURIComponent(match.product.name)}">عرض المنتج</a></div>`];
      return ['مش لاقي المنتج بالاسم ده دلوقتي 🤔 جرّب تكتب اسم أوضح، أو اختار قسم من اللي تحت وأنا أساعدك.', categoryButtons()];
    }

    function appendBot(text, buttons = '') {
      const botMessage = document.createElement('div');
      botMessage.className = 'msg bot';
      botMessage.innerHTML = `${text}${buttons || ''}`;
      chatMessages.appendChild(botMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      attachHandlers();
    }

    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'msg bot typing-message';
      typing.innerHTML = '<span class="typing-label">مساعد Market Online يكتب</span><span class="typing-indicator" aria-label="جاري كتابة الرد"><span></span><span></span><span></span></span>';
      chatMessages.appendChild(typing);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTyping() {
      chatMessages.querySelector('.typing-message')?.remove();
    }

    function sendMessage() {
      if (isReplying || !chatInput) return;
      const message = chatInput.value.trim().slice(0, maxMessageLength);
      if (!message) return;
      const userMessage = document.createElement('div');
      userMessage.className = 'msg user';
      userMessage.textContent = message;
      chatMessages.appendChild(userMessage);
      chatInput.value = '';
      updateCharacterCount();
      isReplying = true;
      chatInput.disabled = true;
      if (chatSend) chatSend.disabled = true;
      showTyping();
      chatMessages.scrollTop = chatMessages.scrollHeight;
      const delay = Math.min(1250, Math.max(550, 350 + message.length * 22));
      window.setTimeout(() => {
        const [text, buttons] = generateResponse(message);
        removeTyping();
        appendBot(text, buttons);
        isReplying = false;
        chatInput.disabled = false;
        if (chatSend) chatSend.disabled = false;
        chatInput.focus();
      }, delay);
    }

    function updateCharacterCount() {
      const count = document.querySelector('.chat-char-count');
      if (count && chatInput) count.textContent = `${chatInput.value.length}/${maxMessageLength}`;
    }

    function resetConversation() {
      chatMessages.innerHTML = '<div class="msg bot initial-message">أهلاً بك! اسألني عن الأقسام أو التوصيل أو الأسعار، وأنا هساعدك فورًا 😊</div>' + quickButtons();
      attachHandlers();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function attachHandlers() {
      chatMessages.querySelectorAll('[data-store-action], [data-store-category]').forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
          const categoryId = button.dataset.storeCategory;
          if (categoryId) {
            const category = catalog.find(item => String(item.id) === categoryId);
            if (category) appendBot(productsText(category), categoryButtons());
            return;
          }
          const action = button.dataset.storeAction;
          const prompts = { categories: 'عايز أعرف الأقسام', prices: 'عايز أعرف أسعار المنتجات', delivery: 'عايز أعرف التوصيل', payment: 'عايز أعرف طرق الدفع' };
          chatInput.value = prompts[action] || '';
          sendMessage();
        });
      });
    }

    chatToggle.addEventListener('click', () => {
      chatWidget.classList.toggle('open');
      if (chatWidget.classList.contains('open')) setTimeout(() => chatInput?.focus(), 250);
    });
    chatClose?.addEventListener('click', () => chatWidget.classList.remove('open'));
    chatClear?.addEventListener('click', resetConversation);
    chatSend?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('input', updateCharacterCount);
    chatInput?.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
    document.addEventListener('click', event => { if (chatWidget.classList.contains('open') && !chatWidget.contains(event.target) && !chatToggle.contains(event.target)) chatWidget.classList.remove('open'); });
    attachHandlers();
  };
})();
