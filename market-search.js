(function initMarketSearch() {
  const inputs = [...document.querySelectorAll('#marketSearch, #categorySearch, #productSearch, #offersSearch')];
  let catalog = [];

  const normalize = value => String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ar-EG')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ')
    .trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

  function flattenCategories(categories) {
    const result = [];
    const seenCategories = new Set();
    const visit = category => {
      if (!category || !category.id || seenCategories.has(String(category.id))) return;
      seenCategories.add(String(category.id));
      result.push(category);
      (category.products || []).forEach(product => result.push({ product, category }));
      (category.children || []).forEach(visit);
    };
    (Array.isArray(categories) ? categories : []).forEach(visit);
    return result;
  }

  function rebuildCatalog(eventCategories) {
    const categories = Array.isArray(window.marketCategoriesFlat) && window.marketCategoriesFlat.length
      ? window.marketCategoriesFlat
      : (eventCategories || window.marketCategories || []);
    const entries = flattenCategories(categories);
    const seenProducts = new Set();
    catalog = entries.map(entry => {
      if (entry.product) {
        const product = entry.product;
        const productKey = String(product.id || `${entry.category.id}:${product.name}`);
        if (seenProducts.has(productKey)) return null;
        seenProducts.add(productKey);
        return {
          type: 'product',
          name: product.name,
          description: `${entry.category.name} - ${product.unit || 'قطعة'}`,
          categoryId: entry.category.id,
          price: product.price,
          isActive: product.isActive !== false
        };
      }
      const category = entry;
      return {
        type: 'category',
        name: category.name,
        description: category.description || `${category.allProducts?.length || category.products?.length || 0} منتج`,
        categoryId: category.id,
        isActive: true
      };
    }).filter(Boolean);
  }

  function createResultsBox(input) {
    const wrapper = input.closest('.market-search, .category-search-box, .product-search-box, .offers-search-box') || input.parentElement;
    wrapper.classList.add('market-search-host');
    let box = wrapper.querySelector('.market-search-results');
    if (!box) {
      box = document.createElement('div');
      box.className = 'market-search-results';
      box.setAttribute('role', 'listbox');
      wrapper.appendChild(box);
    }
    return box;
  }

  function getResults(query) {
    const normalized = normalize(query);
    if (!normalized) return [];
    return catalog.filter(item => normalize(`${item.name} ${item.description}`).includes(normalized));
  }

  function render(input, query) {
    const box = createResultsBox(input);
    const normalized = normalize(query);
    if (!normalized) {
      box.innerHTML = '';
      box.classList.remove('open');
      input.closest('.market-hero')?.classList.remove('has-search-results');
      return;
    }

    const results = getResults(query);
    box.innerHTML = results.length ? results.map(item => {
      const unavailable = item.type === 'product' && item.isActive === false;
      const href = `game-detail.html?category=${encodeURIComponent(item.categoryId)}${item.type === 'product' ? `&product=${encodeURIComponent(item.name)}` : ''}`;
      return `<a class="market-search-result${unavailable ? ' is-unavailable' : ''}" role="option" href="${href}">
        <span class="market-search-result-icon"><i class="fas ${item.type === 'category' ? 'fa-layer-group' : 'fa-box-open'}"></i></span>
        <span class="market-search-result-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}${item.type === 'product' && item.price != null ? ` - ${Number(item.price).toLocaleString('ar-EG')} جنيه` : ''}</small></span>
        ${unavailable ? '<b class="market-search-result-status">غير متاح</b>' : '<i class="fas fa-arrow-left market-search-result-arrow"></i>'}
      </a>`;
    }).join('') : '<div class="market-search-empty">لا توجد نتائج مطابقة</div>';
    input.closest('.market-hero')?.classList.add('has-search-results');
    box.classList.add('open');
  }

  inputs.forEach(input => {
    input.addEventListener('input', event => render(input, event.target.value));
    input.addEventListener('focus', event => {
      if (event.target.value) render(input, event.target.value);
    });
  });

  window.addEventListener('catalog:updated', event => {
    rebuildCatalog(event.detail);
    inputs.forEach(input => {
      if (input.value) render(input, input.value);
    });
  });
  rebuildCatalog();

  document.addEventListener('click', event => {
    if (!event.target.closest('.market-search-host')) {
      document.querySelectorAll('.market-search-results.open').forEach(box => {
        box.classList.remove('open');
        box.closest('.market-hero')?.classList.remove('has-search-results');
      });
    }
  });
})();
