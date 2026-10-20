// Disney fallback catalog: a small, honest offline preview only. Supabase remains the source of truth.
const disneyFallbackImage = 'https://i.pinimg.com/736x/13/76/29/137629addfec18847a78261aca0ae916.jpg';
const disneyImage = (id, width = 900) => {
  const value = String(id || '').toLowerCase();
  const photoId = value.match(/photo-[a-z0-9-]+/)?.[0] || 'photo-1490750967868-88aa4486c946';
  return 'https://images.unsplash.com/' + photoId + '?auto=format&fit=crop&w=' + width + '&q=84';
};

const marketCategories = [
  {
    id: 'bouquets', name: 'بوكيهات الورد الطبيعي', description: 'تنسيقات طازة لكل لحظة', image: disneyImage('photo-1490750967868-88aa4486c946'), meta: 'بوكيهات مختارة',
    products: [
      { id: 'fallback-bouquet-rose', name: 'بوكيه ورد أحمر كلاسيك', unit: 'باقة', price: 450, oldPrice: 520, isSpecialOffer: true, image: disneyImage('photo-1523438885200-e635ba2c371e', 700) },
      { id: 'fallback-bouquet-pink', name: 'بوكيه ورد وردي ناعم', unit: 'باقة', price: 390, image: disneyImage('photo-1513883049090-d0b7439799bf', 700) }
    ]
  },
  {
    id: 'red-roses', name: 'الورد الأحمر', description: 'رسالة حب لا تحتاج كلامًا', image: disneyImage('photo-1526047932273-341f2a7631f9'), meta: 'اختيارات رومانسية',
    products: [
      { id: 'fallback-red-12', name: '12 وردة حمراء مع تغليف فاخر', unit: '12 وردة', price: 650, image: disneyImage('photo-1526047932273-341f2a7631f9', 700) },
      { id: 'fallback-red-24', name: '24 وردة حمراء في بوكس', unit: '24 وردة', price: 1100, image: disneyImage('photo-1519225421980-715cb0215aed', 700) }
    ]
  },
  {
    id: 'pink-white-roses', name: 'الورد الوردي والأبيض', description: 'ألوان هادئة وذوق رقيق', image: disneyImage('photo-1518709268805-4e9042af9f23'), meta: 'تنسيقات ناعمة',
    products: [
      { id: 'fallback-pink-white', name: 'بوكيه ورد وردي وأبيض', unit: 'باقة', price: 550, image: disneyImage('photo-1518709268805-4e9042af9f23', 700) },
      { id: 'fallback-white', name: 'ورد أبيض مع لمسة خضراء', unit: 'باقة', price: 480, image: disneyImage('photo-1490750967868-88aa4486c946', 700) }
    ]
  },
  {
    id: 'gift-boxes', name: 'بوكسات الورد والهدايا', description: 'هدية كاملة بتفاصيلها', image: disneyImage('photo-1549465220-1a8b9238cd48'), meta: 'هدايا جاهزة',
    products: [
      { id: 'fallback-box-love', name: 'بوكس حب بالورد والشوكولاتة', unit: 'بوكس', price: 850, oldPrice: 980, isSpecialOffer: true, image: disneyImage('photo-1549465220-1a8b9238cd48', 700) },
      { id: 'fallback-box-luxury', name: 'بوكس Disney الفاخر', unit: 'بوكس', price: 1250, image: disneyImage('photo-1526047932273-341f2a7631f9', 700) }
    ]
  },
  {
    id: 'chocolate-sweets', name: 'الشوكولاتة والحلويات', description: 'تفاصيل حلوة تكمّل الهدية', image: disneyImage('photo-1549465220-1a8b9238cd48'), meta: 'اختيارات لذيذة',
    products: [
      { id: 'fallback-chocolate', name: 'علبة شوكولاتة فاخرة', unit: 'علبة', price: 420, image: disneyImage('photo-1549465220-1a8b9238cd48', 700) },
      { id: 'fallback-sweets', name: 'سلة حلويات وورد صغير', unit: 'سلة', price: 560, image: disneyImage('photo-1549007994-cb92caebd54b', 700) }
    ]
  },
  {
    id: 'teddy-gifts', name: 'الدُمى والهدايا اللطيفة', description: 'فرحة صغيرة بتفضل في القلب', image: disneyImage('photo-1559454403-b8fb88521f11'), meta: 'هدايا لطيفة',
    products: [
      { id: 'fallback-teddy', name: 'دبدوب مع بوكيه ورد', unit: 'قطعة', price: 720, image: disneyImage('photo-1559454403-b8fb88521f11', 700) },
      { id: 'fallback-cute-box', name: 'بوكس لطيف للمفاجآت', unit: 'بوكس', price: 640, image: disneyImage('photo-1549465220-1a8b9238cd48', 700) }
    ]
  },
  {
    id: 'birthday-gifts', name: 'هدايا أعياد الميلاد', description: 'احتفل باليوم اللي يخصهم', image: disneyImage('photo-1513151233558-d860c5398176'), meta: 'مفاجآت الميلاد',
    products: [
      { id: 'fallback-birthday', name: 'باقة عيد ميلاد مع بالونات', unit: 'تنسيق', price: 780, image: disneyImage('photo-1513151233558-d860c5398176', 700) },
      { id: 'fallback-birthday-box', name: 'بوكس عيد ميلاد مميز', unit: 'بوكس', price: 930, image: disneyImage('photo-1549465220-1a8b9238cd48', 700) }
    ]
  },
  {
    id: 'anniversary', name: 'هدايا المناسبات والذكرى السنوية', description: 'لذكرى تستحق الاحتفال', image: disneyImage('photo-1519225421980-715cb0215aed'), meta: 'مناسبات خاصة',
    products: [
      { id: 'fallback-anniversary', name: 'تنسيق ذكرى سنوية فاخر', unit: 'تنسيق', price: 980, image: disneyImage('photo-1519225421980-715cb0215aed', 700) },
      { id: 'fallback-anniversary-box', name: 'بوكس ذكرى مع رسالة', unit: 'بوكس', price: 1150, image: disneyImage('photo-1523438885200-e635ba2c371e', 700) }
    ]
  },
  {
    id: 'gift-cards', name: 'بطاقات الإهداء', description: 'اكتب إحساسك بطريقتك', image: disneyImage('photo-1513883049090-d0b7439799bf'), meta: 'رسائل من القلب',
    products: [
      { id: 'fallback-card-love', name: 'بطاقة إهداء رومانسية', unit: 'بطاقة', price: 65, image: disneyImage('photo-1513883049090-d0b7439799bf', 700) },
      { id: 'fallback-card-custom', name: 'بطاقة باسمك وتصميم مخصص', unit: 'بطاقة', price: 90, image: disneyImage('photo-1513151233558-d860c5398176', 700) }
    ]
  },
  {
    id: 'custom-gifts', name: 'هدايا مخصصة حسب الطلب', description: 'نصممها على ذوقك', image: disneyImage('photo-1518709268805-4e9042af9f23'), meta: 'اطلب تصميمك',
    products: [
      { id: 'fallback-custom', name: 'هدية مخصصة باسم المرسل', unit: 'طلب خاص', price: 700, image: disneyImage('photo-1549465220-1a8b9238cd48', 700) },
      { id: 'fallback-custom-bouquet', name: 'بوكيه من اختيارك', unit: 'طلب خاص', price: 850, image: disneyImage('photo-1490750967868-88aa4486c946', 700) }
    ]
  }
];

window.marketCategories = marketCategories;
window.DISNEY_FLOWER_FALLBACK_CATALOG = true;

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

  if (!categoryCards || !productView) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const money = value => `${Number(value || 0).toLocaleString('ar-EG')} جنيه`;
  const safeImage = value => String(value || disneyFallbackImage).replace(/'/g, '%27');
  const getCart = () => { try { return JSON.parse(localStorage.getItem('gameCart') || '[]'); } catch { return []; } };
  const saveCart = cart => { localStorage.setItem('gameCart', JSON.stringify(cart)); window.updateNavCartUI?.(); };
  const getRoots = () => Array.isArray(window.marketCategories) ? window.marketCategories : marketCategories;
  const getCategoryList = () => window.marketCategoriesFlat || getRoots();
  const favoriteKey = (category, product) => String(product.id || `disney_${category.id}_${product.name}`);
  const favoriteList = () => window.FavoritesStore?.read?.() || JSON.parse(localStorage.getItem('gameFavorites') || '[]');

  const nestedCategoryTemplate = category => `<button type="button" class="nested-category-card" data-nested-category="${escapeHtml(category.id)}"><div class="nested-category-card-image" style="background-image:url('${safeImage(category.image || category.products?.[0]?.image)}'),url('${disneyFallbackImage}')"></div><div class="nested-category-card-content"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description || '')}</p><strong>${category.allProducts?.length || category.products?.length || 0} منتج <i class="fas fa-arrow-left"></i></strong></div></button>`;

  const favoritesOnly = new URLSearchParams(window.location.search).get('favorites') === '1';
  const isFavoriteProduct = (category, product) => favoriteList().includes(favoriteKey(category, product));

  function renderCategories(query = '') {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar-EG');
    const filtered = getRoots().filter(category => (category.name + ' ' + category.description).toLocaleLowerCase('ar-EG').includes(normalizedQuery) && (!favoritesOnly || (category.allProducts || category.products || []).some(product => isFavoriteProduct(category, product))));
    categoryCards.innerHTML = filtered.map(category => `<a class="category-card" href="game-detail.html?category=${encodeURIComponent(category.id)}" data-category-id="${escapeHtml(category.id)}"><div class="category-card-image" style="background-image:url('${safeImage(category.image)}'),url('${disneyFallbackImage}')"></div><div class="category-card-content"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description)}</p><div class="category-card-meta"><span>${escapeHtml(category.meta || `${category.products?.length || 0} منتجات`)}</span><strong>تصفح القسم <i class="fas fa-arrow-left"></i></strong></div></div></a>`).join('') || '<p class="category-empty">لم نجد قسمًا بهذا الاسم.</p>';
  }

  function productTemplate(category, product, index) {
    const key = favoriteKey(category, product);
    const isFavorite = favoriteList().includes(key);
    const unavailable = product.isActive === false;
    return `<article class="product-card${unavailable ? ' product-unavailable' : ''}" data-product-index="${index}"><div class="product-card-image" style="background-image:url('${safeImage(product.image)}'),url('${disneyFallbackImage}')"><button type="button" class="disney-favorite-btn${isFavorite ? ' is-favorite' : ''}" data-action="favorite" aria-label="${isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}" aria-pressed="${isFavorite}" data-favorite-key="${escapeHtml(key)}"><i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i></button>${unavailable ? '<span class="product-unavailable-label">غير متاح حاليًا</span>' : ''}</div><div class="product-card-body"><h3>${escapeHtml(product.name)}</h3><span class="product-unit">${escapeHtml(product.unit || 'قطعة')}</span><div class="product-price-row"><strong class="product-price">${money(product.price)}</strong>${Number(product.oldPrice) > Number(product.price) ? `<del class="product-old-price">${money(product.oldPrice)}</del>` : ''}</div><div class="product-actions"><div class="quantity-control"><button type="button" data-action="decrease" aria-label="تقليل الكمية">-</button><output>1</output><button type="button" data-action="increase" aria-label="زيادة الكمية">+</button></div><button class="product-add-btn" type="button" data-action="add"${unavailable ? ' disabled' : ''}><i class="fas fa-cart-plus"></i> أضف</button><button class="product-buy-btn" type="button" data-action="buy"${unavailable ? ' disabled' : ''}><i class="fab fa-whatsapp"></i> اطلب</button></div></div></article>`;
  }

  function openCategory(categoryId) {
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
    else cart.push({ id, type: 'disney', key: category.id, productId: product.id || null, name: product.name, priceEGP: Number(product.price) || 0, oldPriceEGP: product.oldPrice || null, img: product.image || disneyFallbackImage, quantity });
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
  window.addEventListener('catalog:updated', () => { renderCategories(searchInput?.value || ''); if (!productView.hidden && activeCategoryId) openCategory(activeCategoryId); });
  renderCategories();
})();