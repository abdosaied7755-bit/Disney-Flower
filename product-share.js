(function initProductSharing() {
  const makeUrl = (category, product) => {
    const url = new URL('game-detail.html', window.location.href);
    url.searchParams.set('category', category.id);
    if (product.id) url.searchParams.set('product', product.id);
    return url.href;
  };
  const closeMenus = () => document.querySelectorAll('.product-share-menu').forEach(menu => menu.remove());

  function openShareMenu(button, category, product) {
    closeMenus();
    const url = makeUrl(category, product);
    const text = `شوف ${product.name} من Disney Flower`;
    const menu = document.createElement('div');
    menu.className = 'product-share-menu';
    menu.innerHTML = `<strong>شارك المنتج</strong><button type="button" data-share-channel="whatsapp"><i class="fab fa-whatsapp"></i> واتساب</button><button type="button" data-share-channel="facebook"><i class="fab fa-facebook-f"></i> فيسبوك</button><button type="button" data-share-channel="copy"><i class="fas fa-link"></i> نسخ الرابط</button>`;
    button.closest('.product-card, .catalog-product-card, .offer-card')?.appendChild(menu);
    menu.addEventListener('click', async event => {
      const action = event.target.closest('[data-share-channel]')?.dataset.shareChannel;
      if (!action) return;
      if (action === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
      if (action === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
      if (action === 'copy') {
        try { await navigator.clipboard.writeText(url); } catch { window.prompt('انسخ رابط المنتج:', url); }
        button.setAttribute('aria-label', 'تم نسخ رابط المنتج');
      }
      menu.remove();
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.product-share-btn') && !event.target.closest('.product-share-menu')) closeMenus();
  });
  window.DisneyProductShare = { open: openShareMenu };
})();
