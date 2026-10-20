(async function initCategoryDetail() {
  const categoryId = new URLSearchParams(window.location.search).get('category');
  const requestedProduct = new URLSearchParams(window.location.search).get('product');
  const getCategories = () => window.marketCategoriesFlat || window.marketCategories || [];
  const grid = document.getElementById('categoryProductGrid');
  const title = document.getElementById('categoryDetailTitle');
  const description = document.getElementById('categoryDetailDescription');
  const count = document.getElementById('categoryDetailCount');

  if (!grid) return;

  const imageStyle = value => { const image = String(value || '').trim().replace(/'/g, '%27'); return image ? `background-image:url('${image}')` : ''; };

  const catalogLoadingMarkup = '<div class="catalog-inline-loader" role="status"><span class="catalog-loader-spinner" aria-hidden="true"></span><p>جاري تحميل منتجات القسم...</p></div>';
  const catalogErrorMarkup = '<div class="catalog-inline-loader catalog-inline-error" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><p>تعذر تحميل منتجات القسم حاليًا. حاول تحديث الصفحة.</p></div>';
  const showCatalogState = markup => { grid.innerHTML = markup; };

  const money = value => `${value.toLocaleString('ar-EG')} جنيه`;
  const getCart = () => JSON.parse(localStorage.getItem('gameCart') || '[]');
  const saveCart = cart => {
    localStorage.setItem('gameCart', JSON.stringify(cart));
    if (typeof updateNavCartUI === 'function') updateNavCartUI();
  };

  function renderCategory(category) {
    if (!category) return;
    const products = category.products || [];
    const childCategories = category.children || [];
    document.title = `Disney - ${category.name}`;
    title.textContent = category.name;
    description.textContent = `${category.description} - اختيارات مختارة بأسعار واضحة وتوصيل سريع.`;
    count.textContent = `${(category.allProducts || products).filter(product => product.isActive !== false).length} منتجات داخل القسم`;
    const childCards = childCategories.map(child => `<a class='nested-category-card' href='game-detail.html?category=${encodeURIComponent(child.id)}'><div class='nested-category-card-image' style="${imageStyle(child.image || child.products?.[0]?.image)}"></div><div class='nested-category-card-content'><h3>${child.name}</h3><p>${child.description || ''}</p><strong>${child.allProducts?.length || child.products?.length || 0} منتجات <i class='fas fa-arrow-left'></i></strong></div></a>`).join('');
    const productCards = products.map((product, index) => `
    <article class="product-card${product.isActive === false ? ' is-unavailable' : ''}" data-product-index="${index}" aria-disabled="${product.isActive === false}">
      <div class="product-card-image" style="${imageStyle(product.image)}"></div>
      <div class="product-card-body">
        <h3>${product.name}</h3><span class="product-unit">${product.unit}</span><strong class="product-price">${money(product.price)}</strong>
        ${product.isActive === false ? '<strong class="product-unavailable-label">غير متاح</strong>' : '<div class="product-actions"><div class="quantity-control"><button type="button" data-action="decrease" aria-label="تقليل الكمية">-</button><output>1</output><button type="button" data-action="increase" aria-label="زيادة الكمية">+</button></div><button class="product-add-btn" type="button" data-action="add"><i class="fas fa-cart-plus"></i> أضف للسلة</button><button class="product-buy-btn" type="button" data-action="buy"><i class="fab fa-whatsapp"></i> شراء</button></div>'}
      </div>
    </article>`).join('');
    const emptyTitle = String.fromCharCode(1604, 1575, 32, 1578, 1608, 1580, 1583, 32, 1605, 1606, 1578, 1580, 1575, 1578, 32, 1605, 1590, 1575, 1601, 1577, 32, 1604, 1607, 1584, 1575, 32, 1575, 1604, 1602, 1587, 1605, 32, 1581, 1575, 1604, 1610, 1575);
    const emptyDescription = String.fromCharCode(1587, 1610, 1578, 1605, 32, 1573, 1590, 1575, 1601, 1577, 32, 1605, 1606, 1578, 1580, 1575, 1578, 32, 1580, 1583, 1610, 1583, 1577, 32, 1604, 1607, 1584, 1575, 32, 1575, 1604, 1602, 1587, 1605, 32, 1602, 1585, 1610, 1576, 1575);
    const emptyState = childCategories.length === 0
      ? (products.length === 0 ? 'empty' : '')
      : '';
    grid.innerHTML = childCards + productCards;
    if (emptyState === 'empty') {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'category-detail-empty';
      emptyCard.setAttribute('role', 'status');
      const icon = document.createElement('i');
      icon.className = 'fas fa-box-open';
      icon.setAttribute('aria-hidden', 'true');
      const heading = document.createElement('h2');
      heading.textContent = emptyTitle;
      const message = document.createElement('p');
      message.textContent = emptyDescription;
      emptyCard.append(icon, heading, message);
      grid.appendChild(emptyCard);
    }

    grid.querySelectorAll('.product-card').forEach((card, index) => {
    if (products[index].isSpecialOffer) {
      card.classList.add('is-special-offer');
      const badge = document.createElement('span');
      badge.className = 'special-offer-badge';
      badge.textContent = 'عرض خاص';
      card.prepend(badge);
      if (products[index].oldPrice > products[index].price) {
        const oldPrice = document.createElement('del');
        oldPrice.className = 'product-old-price';
        oldPrice.textContent = money(products[index].oldPrice);
        card.querySelector('.product-price')?.before(oldPrice);
      }
    }
    const product = products[Number(card.dataset.productIndex)];
    if (product.isActive === false) return;
    const output = card.querySelector('output');
    const quantity = () => Number(output.value || output.textContent || 1);
    card.querySelector('[data-action="increase"]').addEventListener('click', () => { output.value = quantity() + 1; output.textContent = output.value; });
    card.querySelector('[data-action="decrease"]').addEventListener('click', () => { output.value = Math.max(1, quantity() - 1); output.textContent = output.value; });
    card.querySelector('[data-action="add"]').addEventListener('click', () => {
      const cart = getCart();
      const id = `disney_${product.id || `${category.id}_${product.name}`}`;
      const existing = cart.find(item => item.id === id);
      if (existing) existing.quantity = (existing.quantity || 1) + quantity();
      else cart.push({ id, type: 'disney', key: category.id, productId: product.id || null, name: product.name, priceEGP: product.price, oldPriceEGP: product.oldPrice || null, img: product.image || '', quantity: quantity() });
      saveCart(cart);
      card.classList.remove('is-added');
      requestAnimationFrame(() => card.classList.add('is-added'));
    });
    card.querySelector('[data-action="buy"]').addEventListener('click', () => {
      const cart = getCart();
      const id = `disney_${product.id || `${category.id}_${product.name}`}`;
      const existing = cart.find(item => item.id === id);
      if (existing) existing.quantity = (existing.quantity || 1) + quantity();
      else cart.push({ id, type: 'disney', key: category.id, productId: product.id || null, name: product.name, priceEGP: product.price, oldPriceEGP: product.oldPrice || null, img: product.image || '', quantity: quantity() });
      saveCart(cart);
      window.location.href = 'checkout.html';
    });
    });
    if (requestedProduct) {
    const normalizeProduct = value => String(value || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').trim();
    const target = normalizeProduct(requestedProduct);
    const targetCard = [...grid.querySelectorAll('.product-card')].find(card => {
      const product = products[Number(card.dataset.productIndex)];
      return normalizeProduct(product.name) === target;
    });
    if (targetCard) {
      targetCard.classList.add('is-targeted');
      setTimeout(() => targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  }
  }

  const renderCurrentCategory = () => {
    const categories = getCategories();
    const currentCategory = categories.find(item => String(item.id) === String(categoryId)) || (!categoryId ? categories[0] : null);
    if (currentCategory) {
      renderCategory(currentCategory);
      return;
    }
    const heading = document.createElement('div');
    heading.className = 'category-detail-empty';
    heading.setAttribute('role', 'status');
    heading.innerHTML = '<i class="fas fa-box-open" aria-hidden="true"></i><h2>القسم غير متاح</h2><p>لم نعثر على هذا القسم في البيانات الحالية.</p>';
    grid.replaceChildren(heading);
  };

  showCatalogState(catalogLoadingMarkup);
  window.addEventListener('catalog:updated', event => {
    const updatedCategory = (window.marketCategoriesFlat || event.detail || []).find(item => String(item.id) === String(categoryId)) || (!categoryId ? (event.detail || [])[0] : null);
    if (updatedCategory) renderCategory(updatedCategory);
    else renderCurrentCategory();
  });
  window.addEventListener('catalog:error', () => showCatalogState(catalogErrorMarkup));

  if (window.supabaseCatalog?.ready) {
    window.supabaseCatalog.ready.then(loaded => {
      if (loaded) renderCurrentCategory();
      else showCatalogState(catalogErrorMarkup);
    });
  }
})();
