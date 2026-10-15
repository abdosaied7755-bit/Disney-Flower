(function initHomeCatalog() {
  const heroSlides = document.querySelector('.market-hero-slides');
  const departmentGrid = document.querySelector('.market-department-grid');
  const productGrid = document.querySelector('.popular-games-grid');
  const featureImage = document.querySelector('.market-feature-deal-image');
  if (!heroSlides || !departmentGrid || !productGrid) return;

  const categoryIcons = {
    produce: 'fa-apple-whole',
    pantry: 'fa-basket-shopping',
    drinks: 'fa-bottle-water',
    dairy: 'fa-cheese',
    care: 'fa-spray-can-sparkles',
    kitchen: 'fa-kitchen-set',
    meat: 'fa-drumstick-bite',
    frozen: 'fa-snowflake',
    bakery: 'fa-bread-slice'
  };
  const heroImages = [
    { label: 'خضار وفاكهة طازة', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=72' },
    { label: 'مستلزمات منزلية', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1200&q=72' },
    { label: 'لحوم طازة', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=72' },
    { label: 'مجمدات', image: 'https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=1200&q=72' },
    { label: 'مخبوزات', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=72' },
    { label: 'ألبان وأجبان', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=1200&q=72' },
    { label: 'مطبخ مرتب', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=72' },
    { label: 'تسوق أونلاين', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=72' }
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
    if (name.includes('خضار') || name.includes('فاكه')) return categoryIcons.produce;
    if (name.includes('بقال')) return categoryIcons.pantry;
    if (name.includes('مشروب') || name.includes('سناك')) return categoryIcons.drinks;
    if (name.includes('ألبان') || name.includes('مجمد')) return categoryIcons.dairy;
    if (name.includes('تنظيف') || name.includes('عناي')) return categoryIcons.care;
    if (name.includes('مطبخ')) return categoryIcons.kitchen;
    if (name.includes('لحوم') || name.includes('دجاج')) return categoryIcons.meat;
    if (name.includes('مخبوز') || name.includes('خبز')) return categoryIcons.bakery;
    return 'fa-basket-shopping';
  };

  function render(categories) {
    heroImagesReady.then(loadedHeroImages => {
      const heroSlidesData = loadedHeroImages.length ? loadedHeroImages : [{ label: 'Market Online', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=72' }];
      const slideInterval = 4;
      const duration = Math.max(24, heroSlidesData.length * slideInterval);
      heroSlides.innerHTML = heroSlidesData.map((slide, index) => `<span class="market-hero-slide catalog-hero-slide" aria-label="${escapeHtml(slide.label)}" style="background-image:url('${imageUrl(slide.image)}');--hero-delay:${index * slideInterval}s;--hero-duration:${duration}s"></span>`).join('');
      heroSlides.classList.toggle('has-catalog-slides', heroSlidesData.length > 0);
    });
    const catalogSlides = categories.map(category => ({ image: category.image || category.products?.[0]?.image, label: category.name })).filter(item => item.image);

    departmentGrid.innerHTML = categories.slice(0, 6).map((category, index) => `
      <a href="game-detail.html?category=${encodeURIComponent(category.id)}" class="market-department-card department-${escapeHtml(category.id)}">
        <i class="fas ${getCategoryIcon(category)}" aria-hidden="true"></i><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description)}</small>
      </a>`).join('') || '<p>لا توجد أقسام مضافة بعد.</p>';

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
        <div class="game-card-image" style="background-image:linear-gradient(180deg,rgba(16,42,42,.02),rgba(16,42,42,.5)),url('${imageUrl(product.image)}');background-size:cover;background-position:center">
          <div class="game-card-overlay"><a href="game-detail.html?category=${encodeURIComponent(product.category.id)}&product=${encodeURIComponent(product.name)}" class="game-card-btn">${product.isActive === false ? 'غير متاح' : '<i class="fas fa-eye"></i> عرض المنتج'}</a></div>
        </div>
        <div class="game-card-content"><h3 class="game-card-title">${escapeHtml(product.name)}</h3><div class="game-card-stats"><div class="stat-item"><i class="fas fa-layer-group"></i><span>${escapeHtml(product.category.name)}</span></div><div class="stat-item"><i class="fas fa-tag"></i><span>${Number(product.price).toLocaleString('ar-EG')} جنيه</span></div></div><div class="game-card-price"><span class="price-label"><i class="fas fa-weight-scale"></i> الوحدة: ${escapeHtml(product.unit)}</span></div></div>
      </article>`).join('') || '<p>لا توجد منتجات مضافة بعد.</p>';

    productGrid.querySelectorAll('.catalog-product-card').forEach((card, index) => {
      if (!dailyProducts[index]?.isSpecialOffer) return;
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

    if (featureImage && catalogSlides.length) {
      let activeSlide = 0;
      const showFeatureSlide = () => {
        const slide = catalogSlides[activeSlide % catalogSlides.length];
        featureImage.style.backgroundImage = `linear-gradient(180deg,rgba(10,45,39,.02),rgba(10,45,39,.88)),url('${imageUrl(slide.image)}')`;
        featureImage.setAttribute('aria-label', slide.label);
        activeSlide += 1;
      };
      showFeatureSlide();
      clearInterval(window.homeFeatureSliderTimer);
      window.homeFeatureSliderTimer = setInterval(showFeatureSlide, 4500);
    }
  }

  function getCategories() {
    return Array.isArray(window.marketCategories) ? window.marketCategories : [];
  }

  window.addEventListener('catalog:updated', event => render(event.detail || getCategories()));
  render(getCategories());
})();
