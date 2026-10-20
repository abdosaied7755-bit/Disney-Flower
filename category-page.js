// The live catalog is the only source of product/category data.
const marketCategories = [];
window.marketCategories = marketCategories;
(function initCategoryStore() {
  const categoryCards = document.getElementById('categoryCards');
  const productView = document.getElementById('productView');
  const productGrid = document.getElementById('productGrid');
  const categoryTitle = document.getElementById('categoryViewTitle');
  const productTitle = document.getElementById('productViewTitle');
  const productEyebrow = document.getElementById('productCategoryEyebrow');
  const productCount = document.getElementById('productCount');
  const backButton = document.getElementById('categoryBackBtn');
  const searchInput = document.getElementById('categorySearch');
  let activeCategoryId = null;
  let catalogState = 'loading';

  if (!categoryCards || !productView) return;

  const catalogLoadingMarkup = '<div class="catalog-inline-loader" role="status"><span class="catalog-loader-spinner" aria-hidden="true"></span><p>جاري تحميل الأقسام والمنتجات...</p></div>';
  const catalogErrorMarkup = '<div class="catalog-inline-loader catalog-inline-error" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><p>تعذر تحميل بيانات الكتالوج حاليًا. حاول تحديث الصفحة.</p></div>';
  const setCatalogState = state => {
    catalogState = state;
    if (state === 'loading') {
      categoryCards.hidden = false;
      productView.hidden = true;
      categoryCards.innerHTML = catalogLoadingMarkup;
    } else if (state === 'error') {
      categoryCards.hidden = false;
      productView.hidden = true;
      categoryCards.innerHTML = catalogErrorMarkup;
    }
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const money = value => `${Number(value || 0).toLocaleString('ar-EG')} جنيه`;
  const imageStyle = value => { const image = String(value || '').trim().replace(/'/g, '%27'); return image ? `background-image:url('${image}')` : ''; };
  const getCart = () => { try { return JSON.parse(localStorage.getItem('gameCart') || '[]'); } catch { return []; } };
  const saveCart = cart => { localStorage.setItem('gameCart', JSON.stringify(cart)); window.updateNavCartUI?.(); };
  const getRoots = () => Array.isArray(window.marketCategories) ? window.marketCategories : [];
  const getCategoryList = () => window.marketCategoriesFlat || getRoots();
  const favoriteKey = (category, product) => String(product.id || `disney_${category.id}_${product.name}`);
  const favoriteList = () => window.FavoritesStore?.read?.() || JSON.parse(localStorage.getItem('gameFavorites') || '[]');

  const nestedCategoryTemplate = category => `<button type="button" class="nested-category-card" data-nested-category="${escapeHtml(category.id)}"><div class="nested-category-card-image" style="${imageStyle(category.image || category.products?.[0]?.image)}"></div><div class="nested-category-card-content"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description || '')}</p><strong>${category.allProducts?.length || category.products?.length || 0} منتج <i class="fas fa-arrow-left"></i></strong></div></button>`;

  const favoritesOnly = new URLSearchParams(window.location.search).get('favorites') === '1';
  const isFavoriteProduct = (category, product) => favoriteList().includes(favoriteKey(category, product));

  function renderCategories(query = '') {
    if (catalogState !== 'ready') return;
    const normalizedQuery = query.trim().toLocaleLowerCase('ar-EG');
    const filtered = getRoots().filter(category => (category.name + ' ' + category.description).toLocaleLowerCase('ar-EG').includes(normalizedQuery) && (!favoritesOnly || (category.allProducts || category.products || []).some(product => isFavoriteProduct(category, product))));
    categoryCards.innerHTML = filtered.map(category => `<a class="category-card" href="game-detail.html?category=${encodeURIComponent(category.id)}" data-category-id="${escapeHtml(category.id)}"><div class="category-card-image" style="${imageStyle(category.image)}"></div><div class="category-card-content"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description)}</p><div class="category-card-meta"><span>${escapeHtml(category.meta || `${category.products?.length || 0} منتجات`)}</span><strong>تصفح القسم <i class="fas fa-arrow-left"></i></strong></div></div></a>`).join('') || '<p class="category-empty">لم نجد قسمًا بهذا الاسم.</p>';
  }

  function productTemplate(category, product, index) {
    const key = favoriteKey(category, product);
    const isFavorite = favoriteList().includes(key);
    const unavailable = product.isActive === false;
    return `<article class="product-card${unavailable ? ' product-unavailable' : ''}" data-product-index="${index}"><div class="product-card-image" style="${imageStyle(product.image)}"><button type="button" class="disney-favorite-btn${isFavorite ? ' is-favorite' : ''}" data-action="favorite" aria-label="${isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}" aria-pressed="${isFavorite}" data-favorite-key="${escapeHtml(key)}"><i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i></button>${unavailable ? '<span class="product-unavailable-label">غير متاح حاليًا</span>' : ''}</div><div class="product-card-body"><h3>${escapeHtml(product.name)}</h3><span class="product-unit">${escapeHtml(product.unit || 'قطعة')}</span><div class="product-price-row"><strong class="product-price">${money(product.price)}</strong>${Number(product.oldPrice) > Number(product.price) ? `<del class="product-old-price">${money(product.oldPrice)}</del>` : ''}</div><div class="product-actions"><div class="quantity-control"><button type="button" data-action="decrease" aria-label="تقليل الكمية">-</button><output>1</output><button type="button" data-action="increase" aria-label="زيادة الكمية">+</button></div><button class="product-add-btn" type="button" data-action="add"${unavailable ? ' disabled' : ''}><i class="fas fa-cart-plus"></i> أضف</button><button class="product-buy-btn" type="button" data-action="buy"${unavailable ? ' disabled' : ''}><i class="fab fa-whatsapp"></i> اطلب</button></div></div></article>`;
  }

  function openCategory(categoryId) {
    if (catalogState !== 'ready') return;
    const category = getCategoryList().find(item => String(item.id) === String(categoryId));
    if (!category) return;
    activeCategoryId = category.id;
    const categoryProducts = (category.products || []).filter(product => !favoritesOnly || isFavoriteProduct(category, product));
    const childCategories = category.children || [];
    categoryCards.hidden = true; productView.hidden = false; backButton.classList.add('visible');
    categoryTitle.textContent = category.name;
    productEyebrow.textContent = category.description || 'اختيارات Disney المختارة بعناية';
    productTitle.textContent = childCategories.length ? `أقسام ${category.name}` : `منتجات ${category.name}`;
    productCount.textContent = `${categoryProducts.length} منتج داخل القسم`;
    productGrid.innerHTML = childCategories.map(nestedCategoryTemplate).join('') + categoryProducts.map((product, index) => productTemplate(category, product, index)).join('') || '<p class="category-empty">لا توجد منتجات في هذا القسم بعد.</p>';
    productGrid.querySelectorAll('[data-nested-category]').forEach(card => card.addEventListener('click', () => openCategory(card.dataset.nestedCategory)));
    bindProductActions(category);
    document.querySelector('.category-browser-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindProductActions(category) {
    productGrid.querySelectorAll('.product-card').forEach(card => {
      const product = category.products[Number(card.dataset.productIndex)];
      if (!product) return;
      const output = card.querySelector('output');
      card.querySelector('[data-action="increase"]')?.addEventListener('click', () => { output.value = Number(output.value || output.textContent) + 1; output.textContent = output.value; });
      card.querySelector('[data-action="decrease"]')?.addEventListener('click', () => { const next = Math.max(1, Number(output.value || output.textContent) - 1); output.value = next; output.textContent = next; });
      card.querySelector('[data-action="add"]')?.addEventListener('click', () => addProduct(category, product, Number(output.value || output.textContent), card));
      card.querySelector('[data-action="buy"]')?.addEventListener('click', () => { addProduct(category, product, Number(output.value || output.textContent), card); window.location.href = 'checkout.html'; });
      card.querySelector('[data-action="favorite"]')?.addEventListener('click', event => toggleFavorite(event.currentTarget, favoriteKey(category, product)));
    });
  }

  function addProduct(category, product, quantity, card) {
    const cart = getCart();
    const id = `disney_${product.id || `${category.id}_${product.name}`}`;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity = (existing.quantity || 1) + quantity;
    else cart.push({ id, type: 'disney', key: category.id, productId: product.id || null, name: product.name, priceEGP: Number(product.price) || 0, oldPriceEGP: product.oldPrice || null, img: product.image || '', quantity });
    saveCart(cart);
    card?.classList.remove('is-added');
    requestAnimationFrame(() => card?.classList.add('is-added'));
  }

  function toggleFavorite(button, key) {
    const list = favoriteList();
    const next = list.includes(key) ? list.filter(item => item !== key) : [...list, key];
    window.FavoritesStore?.write?.(next) || localStorage.setItem('gameFavorites', JSON.stringify(next));
    button.classList.toggle('is-favorite', next.includes(key));
    button.setAttribute('aria-pressed', String(next.includes(key)));
    button.setAttribute('aria-label', next.includes(key) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
    button.innerHTML = `<i class="${next.includes(key) ? 'fas' : 'far'} fa-heart"></i>`;
    window.FavoritesStore?.updateBadge?.();
  }

  backButton.addEventListener('click', () => { const current = getCategoryList().find(category => String(category.id) === String(activeCategoryId)); if (current?.parentId) return openCategory(current.parentId); activeCategoryId = null; productView.hidden = true; categoryCards.hidden = false; backButton.classList.remove('visible'); categoryTitle.textContent = 'تسوق حسب القسم'; });
  searchInput?.addEventListener('input', event => renderCategories(event.target.value));
  window.addEventListener('catalog:updated', () => {
    setCatalogState('ready');
    renderCategories(searchInput?.value || '');
    if (!productView.hidden && activeCategoryId) openCategory(activeCategoryId);
  });
  window.addEventListener('catalog:error', () => setCatalogState('error'));
  setCatalogState('loading');
})();