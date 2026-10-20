(function initSupabaseCatalog() {
  const SUPABASE_URL = 'https://srpfxplqcigxthzbxseu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fNwkuYfrxMnEgj3IToEfgw_RzVpXuoe';
  const CATALOG_TIMEOUT_MS = 12000;

  window.DISNEY_FLOWER_CONFIG = Object.freeze({
    name: 'Disney',
    address: 'قنا / عمرو أفندي / آخر شارع أجواء',
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
  });

  const hasSupabaseClient = window.supabase && typeof window.supabase.createClient === 'function';
  const client = hasSupabaseClient
    ? window.supabase.createClient(
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
      )
    : null;
  window.supabaseCatalog = { client, loadedFromDatabase: false, realtimeEnabled: false };

  async function fetchTable(table, query) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!response.ok) throw new Error(`Supabase ${table} request failed (${response.status})`);
    return { data: await response.json(), error: null };
  }

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
    const request = Promise.all([
      client
        ? client.from('categories').select('*').eq('is_active', true).order('sort_order')
        : fetchTable('categories', 'select=*&is_active=eq.true&order=sort_order.asc'),
      client
        ? client.from('products').select('*').order('created_at', { ascending: false })
        : fetchTable('products', 'select=*&order=created_at.desc')
    ]);
    const timeout = new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('انتهت مهلة تحميل كتالوج Disney.')), CATALOG_TIMEOUT_MS);
    });
    const [categoriesResult, productsResult] = await Promise.race([request, timeout]);

    if (categoriesResult.error || productsResult.error) {
      window.supabaseCatalog.lastError = categoriesResult.error || productsResult.error;
      console.warn('Supabase catalog is unavailable; no local catalog fallback will be shown.', categoriesResult.error || productsResult.error);
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
    window.supabaseCatalog.lastError = error;
    window.dispatchEvent(new CustomEvent('catalog:error', { detail: error }));
    console.warn('Supabase catalog load failed; no local catalog fallback will be shown.', error);
    return false;
  });

  window.supabaseCatalog.ready.then(() => {
    if (!client) return;
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
