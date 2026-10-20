(function initOffersPage() {
  const grid = document.getElementById('offersGrid');
  const emptyState = document.getElementById('offersEmpty');
  const searchInput = document.getElementById('offersSearch');
  const categoryFilter = document.getElementById('offersCategoryFilter');
  if (!grid || !emptyState) return;

  const state = {
    items: [],
    visibleItems: [],
    query: '',
    category: 'all'
  };

  const money = value => Number(value || 0).toLocaleString('ar-EG', {
    maximumFractionDigits: 2
  }) + ' جنيه';

  const normalize = value => String(value || '')
    .toLocaleLowerCase('ar-EG')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .trim();

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));

  const safeImage = value => {
    const url = String(value || '').trim();
    return /^https?:\/\//i.test(url)
      ? url
      : 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=78';
  };

  function getCatalogRows() {
    const flatCategories = Array.isArray(window.marketCategoriesFlat) && window.marketCategoriesFlat.length
      ? window.marketCategoriesFlat
      : null;
    const categories = flatCategories || (Array.isArray(window.marketCategories) ? window.marketCategories : []);
    const rows = [];
    const seen = new Set();

    categories.forEach(category => {
      const products = flatCategories
        ? (category.products || [])
        : (category.allProducts || category.products || []);

      products.forEach(product => {
        const categoryId = product.categoryId || category.id;
        const owner = flatCategories
          ? (flatCategories.find(item => String(item.id) === String(categoryId)) || category)
          : category;
        const price = Number(product.price);
        const oldPrice = Number(product.oldPrice);

        if (product.isActive === false || product.isSpecialOffer !== true || !(oldPrice > price)) return;

        const key = String(product.id || (categoryId + ':' + product.name));
        if (seen.has(key)) return;
        seen.add(key);

        rows.push({
          product: product,
          category: owner,
          categoryId: categoryId,
          price: price,
          oldPrice: oldPrice,
          discount: Math.max(1, Math.round(((oldPrice - price) / oldPrice) * 100)),
          saving: oldPrice - price,
          key: key
        });
      });
    });

    return rows;
  }

  function renderStats() {
    const total = state.items.length;
    const maxDiscount = state.items.reduce((max, item) => Math.max(max, item.discount), 0);
    const savings = state.items.reduce((sum, item) => sum + item.saving, 0);
    const countElement = document.getElementById('offersCount');
    const discountElement = document.getElementById('offersMaxDiscount');
    const savingsElement = document.getElementById('offersSavings');

    if (countElement) countElement.textContent = total.toLocaleString('ar-EG');
    if (discountElement) discountElement.textContent = maxDiscount.toLocaleString('ar-EG') + '%';
    if (savingsElement) savingsElement.textContent = savings.toLocaleString('ar-EG') + ' جنيه';
  }

  let customCategoryDropdown = null;

  function setupCategoryDropdown() {
    if (!categoryFilter || customCategoryDropdown) return;
    const host = categoryFilter.closest('.offers-filter-box');
    if (!host) return;

    host.classList.add('offers-custom-select');
    categoryFilter.classList.add('offers-native-select');
    categoryFilter.setAttribute('tabindex', '-1');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'offers-filter-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="offers-filter-trigger-text"></span><i class="fas fa-chevron-down" aria-hidden="true"></i>';

    const menu = document.createElement('div');
    menu.className = 'offers-filter-menu';
    menu.setAttribute('role', 'listbox');
    host.append(trigger, menu);

    const close = () => {
      host.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    };
    const renderOptions = () => {
      menu.innerHTML = Array.from(categoryFilter.options).map(option =>
        '<button type="button" role="option" data-value="' + escapeHtml(option.value) + '" aria-selected="' + (option.value === categoryFilter.value) + '">' + escapeHtml(option.textContent) + '</button>'
      ).join('');
      const selected = categoryFilter.options[categoryFilter.selectedIndex];
      const label = trigger.querySelector('.offers-filter-trigger-text');
      if (label) label.textContent = selected ? selected.textContent : '';
    };

    trigger.addEventListener('click', () => {
      const open = !host.classList.contains('is-open');
      document.querySelectorAll('.offers-custom-select.is-open').forEach(other => {
        if (other !== host) other.classList.remove('is-open');
      });
      host.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); trigger.click(); }
    });
    menu.addEventListener('click', event => {
      const option = event.target.closest('[data-value]');
      if (!option) return;
      categoryFilter.value = option.dataset.value;
      categoryFilter.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    });
    categoryFilter.addEventListener('change', renderOptions);
    document.addEventListener('click', event => {
      if (!host.contains(event.target)) close();
    });

    customCategoryDropdown = { renderOptions };
    renderOptions();
  }
  function renderCategoryFilter() {
    if (!categoryFilter) return;

    const categories = [];
    const seen = new Set();
    state.items.forEach(item => {
      const id = String(item.categoryId);
      if (seen.has(id)) return;
      seen.add(id);
      categories.push({ id: id, name: item.category.name });
    });

    if (state.category !== 'all' && !categories.some(item => item.id === state.category)) {
      state.category = 'all';
    }

    categoryFilter.innerHTML = '<option value="all">كل الأقسام</option>' + categories.map(item =>
      '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</option>'
    ).join('');
    categoryFilter.value = state.category;
    setupCategoryDropdown();
    customCategoryDropdown?.renderOptions();
  }

  function cardTemplate(item, index) {
    const product = item.product;
    const category = item.category;
    return '<article class="offer-card" data-offer-index="' + index + '">' +
      '<div class="offer-card-media">' +
        '<img src="' + escapeHtml(safeImage(product.image)) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
        '<span class="offer-label"><i class="fas fa-tags"></i> عرض خاص</span>' +
        '<span class="offer-discount">-' + item.discount.toLocaleString('ar-EG') + '%</span>' +
      '</div>' +
      '<div class="offer-card-body">' +
        '<span class="offer-category"><i class="fas fa-layer-group"></i> ' + escapeHtml(category.name) + '</span>' +
        '<h3 class="offer-title">' + escapeHtml(product.name) + '</h3>' +
        '<span class="offer-unit">' + escapeHtml(product.unit || 'وحدة واحدة') + '</span>' +
        '<div class="offer-price-row"><del class="offer-old-price">' + money(item.oldPrice) + '</del><strong class="offer-current-price">' + money(item.price) + '</strong></div>' +
        '<span class="offer-saving"><i class="fas fa-arrow-trend-down"></i> وفّر ' + money(item.saving) + '</span>' +
        '<div class="offer-actions">' +
          '<div class="quantity-control"><button type="button" data-action="decrease" aria-label="تقليل الكمية">-</button><output>1</output><button type="button" data-action="increase" aria-label="زيادة الكمية">+</button></div>' +
          '<button class="offer-add-btn" type="button" data-action="add"><i class="fas fa-cart-plus"></i> أضف</button>' +
          '<button class="offer-buy-btn" type="button" data-action="buy"><i class="fab fa-whatsapp"></i> شراء</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function render() {
    const query = normalize(state.query);
    const selectedCategory = String(state.category);
    state.visibleItems = state.items.filter(item => {
      const matchesCategory = selectedCategory === 'all' || String(item.categoryId) === selectedCategory;
      const searchable = normalize(item.product.name + ' ' + item.category.name + ' ' + (item.product.unit || ''));
      return matchesCategory && (!query || searchable.includes(query));
    });

    renderStats();
    grid.hidden = state.visibleItems.length === 0;
    emptyState.hidden = state.visibleItems.length !== 0;
    grid.innerHTML = state.visibleItems.map(cardTemplate).join('');
  }

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem('gameCart') || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem('gameCart', JSON.stringify(cart));
    if (typeof window.updateNavCartUI === 'function') window.updateNavCartUI();
  }

  function addToCart(item, quantity) {
    const cart = getCart();
    const id = 'market_' + item.categoryId + '_' + item.product.name;
    const existing = cart.find(cartItem => cartItem.id === id);

    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      cart.push({
        id: id,
        type: 'market',
        key: item.categoryId,
        name: item.product.name,
        priceEGP: item.price,
        img: item.product.image,
        quantity: quantity
      });
    }

    saveCart(cart);
  }

  grid.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const card = actionButton.closest('[data-offer-index]');
    if (!card) return;

    const item = state.visibleItems[Number(card.dataset.offerIndex)];
    if (!item) return;

    const output = card.querySelector('output');
    const currentQuantity = () => Math.max(1, Number(output.value || output.textContent || 1));
    const action = actionButton.dataset.action;

    if (action === 'increase') {
      output.value = currentQuantity() + 1;
      output.textContent = output.value;
      return;
    }

    if (action === 'decrease') {
      output.value = Math.max(1, currentQuantity() - 1);
      output.textContent = output.value;
      return;
    }

    addToCart(item, currentQuantity());

    if (action === 'add') {
      card.classList.remove('is-added');
      requestAnimationFrame(() => card.classList.add('is-added'));
      return;
    }

    if (action === 'buy') {
      window.location.href = 'checkout.html';
    }
  });

  searchInput?.addEventListener('input', event => {
    state.query = event.target.value;
    render();
  });

  categoryFilter?.addEventListener('change', event => {
    state.category = event.target.value;
    render();
  });

  function refresh() {
    state.items = getCatalogRows();
    renderCategoryFilter();
    render();
  }

  window.addEventListener('catalog:updated', refresh);
  refresh();

  if (window.supabaseCatalog?.ready) {
    window.supabaseCatalog.ready.then(refresh);
  }
})();
