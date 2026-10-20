(function initSupabaseCatalog() {
  const SUPABASE_URL = 'https://srpfxplqcigxthzbxseu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fNwkuYfrxMnEgj3IToEfgw_RzVpXuoe';

  window.DISNEY_FLOWER_CONFIG = Object.freeze({
    name: 'Disney',
    address: 'قنا / عمرو أفندي / آخر شارع أجواء',
    supabaseUrl: SUPABASE_URL
  });

  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    window.DISNEY_ADMIN_PAGE
      ? {
          auth: {
            storageKey: 'disney-admin-auth',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        }
      : undefined
  );
  window.supabaseCatalog = { client, loadedFromDatabase: false, realtimeEnabled: false };

  function mapCategory(category, products) {
    return {
      id: category.id,
      slug: category.slug || '',
      name: category.name,
      description: category.description || '',
      sortOrder: Number(category.sort_order) || 0,
      meta: `${products.length} منتج`,
      image: category.image_url || category.image || '',
      parentId: category.parent_id || null,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        unit: product.unit || '',
        price: Number(product.price) || 0,
        oldPrice: product.old_price == null ? null : Number(product.old_price),
        image: product.image_url || product.image || '',
        categoryId: product.category_id,
        isActive: product.is_active !== false,
        isSpecialOffer: product.is_special_offer === true,
        productType: product.product_type || '',
        occasion: product.occasion || '',
        stockQuantity: Number(product.stock_quantity) || 0,
        isFeatured: product.is_featured === true
      }))
    };
  }

  function addCategoryTreeData(categories) {
    const byId = new Map(categories.map(category => [String(category.id), category]));
    categories.forEach(category => {
      category.children = [];
      if (category.parentId && byId.has(String(category.parentId))) {
        byId.get(String(category.parentId)).children.push(category);
      }
    });

    const collectProducts = category => {
      category.allProducts = [...category.products];
      category.children.forEach(child => {
        collectProducts(child);
        category.allProducts.push(...child.allProducts);
      });
      category.meta = `${category.allProducts.length} منتج`;
      return category.allProducts;
    };

    categories.filter(category => !category.parentId || !byId.has(String(category.parentId)))
      .forEach(collectProducts);
    return categories;
  }

  async function loadCatalog() {
    const [categoriesResult, productsResult] = await Promise.all([
      client.from('categories').select('*').eq('is_active', true).order('sort_order'),
      client.from('products').select('*').order('created_at', { ascending: false })
    ]);

    if (categoriesResult.error || productsResult.error) {
      window.supabaseCatalog.lastError = categoriesResult.error || productsResult.error;
      console.warn('Supabase catalog is unavailable; using the local catalog.', categoriesResult.error || productsResult.error);
      window.dispatchEvent(new CustomEvent('catalog:error', { detail: window.supabaseCatalog.lastError }));
      return false;
    }

    if (!Array.isArray(categoriesResult.data) || categoriesResult.data.length === 0) {
      window.supabaseCatalog.lastError = new Error('لا توجد أقسام منشورة في قاعدة Disney بعد.');
      window.dispatchEvent(new CustomEvent('catalog:error', { detail: window.supabaseCatalog.lastError }));
      return false;
    }

    const productsByCategory = productsResult.data.reduce((groups, product) => {
      (groups[product.category_id] ||= []).push(product);
      return groups;
    }, {});

    const nextCategories = addCategoryTreeData(categoriesResult.data.map(category => mapCategory(category, productsByCategory[category.id] || [])));
    const rootCategories = nextCategories.filter(category => !category.parentId || !nextCategories.some(parent => String(parent.id) === String(category.parentId)));
    if (Array.isArray(window.marketCategories)) window.marketCategories.splice(0, window.marketCategories.length, ...rootCategories);
    else window.marketCategories = rootCategories;
    window.marketCategoriesFlat = nextCategories;
    window.supabaseCatalog.loadedFromDatabase = true;
    window.dispatchEvent(new CustomEvent('catalog:updated', { detail: rootCategories }));
    return true;
  }

  window.supabaseCatalog.loadCatalog = loadCatalog;
  window.supabaseCatalog.ready = loadCatalog().catch(error => {
    console.warn('Supabase catalog load failed; using the local catalog.', error);
    return false;
  });

  window.supabaseCatalog.ready.then(() => {
    const channel = client.channel('catalog-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadCatalog())
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          window.supabaseCatalog.realtimeEnabled = true;
          return;
        }
        if (error) console.warn('Supabase catalog realtime is unavailable.', error);
      });
    window.supabaseCatalog.realtimeChannel = channel;
  });
})();
