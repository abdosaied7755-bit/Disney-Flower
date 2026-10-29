(function initHomeCatalog() {
  const heroSlides = document.querySelector('.market-hero-slides');
  const departmentGrid = document.querySelector('.market-department-grid');
  const productGrid = document.querySelector('.popular-games-grid');
  const featureImage = document.querySelector('.market-feature-deal-image');
  if (!heroSlides || !departmentGrid) return;

  let catalogState = 'loading';
  const catalogLoadingMarkup = '<div class="catalog-inline-loader" role="status"><span class="catalog-loader-spinner" aria-hidden="true"></span><p>جاري تحميل بيانات المتجر...</p></div>';
  const catalogErrorMarkup = '<div class="catalog-inline-loader catalog-inline-error" role="alert"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><p>تعذر تحميل بيانات المتجر حاليًا. حاول تحديث الصفحة.</p></div>';

  const categoryIcons = {
    bouquets: 'fa-spa',
    'red-roses': 'fa-heart',
    'pink-white-roses': 'fa-seedling',
    'gift-boxes': 'fa-gift',
    'chocolate-sweets': 'fa-cookie-bite',
    'teddy-gifts': 'fa-paw',
    'birthday-gifts': 'fa-cake-candles',
    anniversary: 'fa-champagne-glasses',
    'gift-cards': 'fa-envelope-open-text',
    'custom-gifts': 'fa-wand-magic-sparkles'
  };
  const heroImages = [
    { label: 'بوكيهات ورد فاخرة', image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=1400&q=86' },
    { label: 'ورد أحمر للحظات الرومانسية', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=86' },
    { label: 'بوكسات هدايا وشوكولاتة', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1400&q=86' },
    { label: 'تنسيقات ورد وردية وبيضاء', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=86' }
  ];
  const heroImagesReady = Promise.all(heroImages.map(slide => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(slide);
    image.onerror = () => resolve(null);
    image.src = slide.image;
  }))).then(images => images.filter(Boolean));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const imageUrl = value => String(value || '').replace(/'/g, '%27');
  const getCategoryIcon = category => {
    const id = String(category.id || '').toLowerCase();
    const name = String(category.name || '').toLocaleLowerCase('ar-EG');
    if (categoryIcons[id]) return categoryIcons[id];
    if (name.includes('ورد') || name.includes('بوكيه')) return 'fa-spa';
    if (name.includes('هدايا') || name.includes('بوكس')) return 'fa-gift';
    if (name.includes('شوكولات') || name.includes('حلويات')) return 'fa-cookie-bite';
    if (name.includes('دمى') || name.includes('دبدوب')) return 'fa-paw';
    if (name.includes('مناسب') || name.includes('ذكرى')) return 'fa-champagne-glasses';
    if (name.includes('بطاق') || name.includes('مخصص')) return 'fa-wand-magic-sparkles';
    if (name.includes('لحوم') || name.includes('دجاج')) return 'fa-heart';
    if (name.includes('مخبوز') || name.includes('خبز')) return 'fa-seedling';
    return 'fa-gift';
  };

  function render(categories) {
    const catalogList = Array.isArray(categories) ? categories : [];
    if (catalogState !== 'ready') {
      departmentGrid.dataset.count = '0';
      departmentGrid.innerHTML = catalogState === 'error' ? catalogErrorMarkup : catalogLoadingMarkup;
      if (productGrid) productGrid.innerHTML = catalogState === 'error' ? catalogErrorMarkup : catalogLoadingMarkup;
      return;
    }
    categories = catalogList;
    heroImagesReady.then(loadedHeroImages => {
      const heroSlidesData = loadedHeroImages.length ? loadedHeroImages : [{ label: 'Disneys & Gifts', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=86' }];
      const slideInterval = 4;
      const duration = Math.max(24, heroSlidesData.length * slideInterval);
      heroSlides.innerHTML = heroSlidesData.map((slide, index) => `<span class="market-hero-slide catalog-hero-slide" aria-label="${escapeHtml(slide.label)}" style="background-image:url('${imageUrl(slide.image)}');--hero-delay:${index * slideInterval}s;--hero-duration:${duration}s"></span>`).join('');
      heroSlides.classList.toggle('has-catalog-slides', heroSlidesData.length > 0);
    });

    const catalogSlides = categories.map(category => ({ image: category.image || category.products?.[0]?.image, label: category.name })).filter(item => item.image);

    const visibleCategories = (Array.isArray(categories) ? categories : []).filter(category => category && category.id && category.name).slice(0, 6);
    departmentGrid.dataset.count = String(visibleCategories.length);
    departmentGrid.innerHTML = visibleCategories.map((category, index) => `
      <a href="game-detail.html?category=${encodeURIComponent(category.id)}" class="market-department-card department-${escapeHtml(category.id)}">
        <i class="fas ${getCategoryIcon(category)}" aria-hidden="true"></i><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description || 'اختيارات Disney المختارة بعناية')}</small>
      </a>`).join('') || '<p>لا توجد أقسام مضافة بعد.</p>';

    if (productGrid) {
      const products = categories.flatMap(category => (category.allProducts || category.products || []).map(product => ({
      ...product,
      category: (window.marketCategoriesFlat || []).find(item => String(item.id) === String(product.categoryId)) || category
    })));
    const today = new Date();
    const dayNumber = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000;
    const dailyProducts = products.length > 2
      ? [products[dayNumber % products.length], products[(dayNumber + 1) % products.length]]
      : products;
    productGrid.innerHTML = dailyProducts.map(product => `
      <article class="game-showcase-card catalog-product-card${product.isActive === false ? ' catalog-product-unavailable' : ''}">
         <div class="game-card-image" style="background-image:url('${imageUrl(product.image)}');background-size:cover;background-position:center">
           <button type="button" class="product-share-btn" data-action="share" aria-label="مشاركة المنتج"><i class="fas fa-share-nodes"></i></button>
          <div class="game-card-overlay"><a href="game-detail.html?category=${encodeURIComponent(product.category.id)}&product=${encodeURIComponent(product.name)}" class="game-card-btn">${product.isActive === false ? 'غير متاح' : '<i class="fas fa-eye"></i> عرض المنتج'}</a></div>
        </div>
        <div class="game-card-content"><h3 class="game-card-title">${escapeHtml(product.name)}</h3><div class="game-card-stats"><div class="stat-item"><i class="fas fa-layer-group"></i><span>${escapeHtml(product.category.name)}</span></div><div class="stat-item"><i class="fas fa-tag"></i><span>${Number(product.price).toLocaleString('ar-EG')} جنيه</span></div></div><div class="game-card-price"><span class="price-label"><i class="fas fa-weight-scale"></i> الوحدة: ${escapeHtml(product.unit)}</span></div></div>
      </article>`).join('') || '<p>لا توجد منتجات مضافة بعد.</p>';

     productGrid.querySelectorAll('.catalog-product-card').forEach((card, index) => {
       const product = dailyProducts[index];
       card.querySelector('[data-action="share"]')?.addEventListener('click', event => {
         event.preventDefault();
         event.stopPropagation();
         window.DisneyProductShare?.open(event.currentTarget, product.category, product);
       });
       if (!product?.isSpecialOffer) return;
      card.classList.add('is-special-offer');
      const badge = document.createElement('span');
      badge.className = 'special-offer-badge';
      badge.textContent = 'عرض خاص';
      card.querySelector('.game-card-image')?.appendChild(badge);
      if (dailyProducts[index].oldPrice > dailyProducts[index].price) {
        const price = card.querySelector('.game-card-stats .stat-item:nth-child(2) span');
        if (price) price.innerHTML = `<del class='catalog-old-price'>${dailyProducts[index].oldPrice.toLocaleString('ar-EG')} جنيه</del> <strong>${dailyProducts[index].price.toLocaleString('ar-EG')} جنيه</strong>`;
      }
    });

    }

    if (featureImage) {
      featureImage.style.backgroundImage = 'none';
      clearInterval(window.homeFeatureSliderTimer);
    }
    if (featureImage && catalogSlides.length) {
      let activeSlide = 0;
      const showFeatureSlide = () => {
        const slide = catalogSlides[activeSlide % catalogSlides.length];
        featureImage.style.backgroundImage = 'url("' + imageUrl(slide.image) + '")';
        featureImage.setAttribute('aria-label', slide.label);
        activeSlide += 1;
      };
      showFeatureSlide();
      window.homeFeatureSliderTimer = setInterval(showFeatureSlide, 4500);
    }
  }

  function getCategories() {
    return Array.isArray(window.marketCategories) ? window.marketCategories : [];
  }

  window.addEventListener('catalog:updated', event => {
    catalogState = 'ready';
    render(event.detail || getCategories());
  });
  window.addEventListener('catalog:error', () => {
    catalogState = 'error';
    render([]);
  });
  render(getCategories());
})();
