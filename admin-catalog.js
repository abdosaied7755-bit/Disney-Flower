(function initAdminCatalog() {
  const catalog = window.supabaseCatalog;
  if (!catalog) return;

  const categoryForm = document.getElementById('categoryForm');
  const productForm = document.getElementById('productForm');
  const offerForm = document.getElementById('offerForm');
  const categorySelect = document.getElementById('productCategory');
  const offerCategory = document.getElementById('offerCategory');
  const categoryParent = document.getElementById('categoryParent') || document.createElement('select');
  const categoryList = document.getElementById('adminCategoryList');
  const productList = document.getElementById('adminProductList');
  const offerList = document.getElementById('adminOfferList');
  const productSearch = document.getElementById('productSearchAdmin');
  const status = document.getElementById('catalogStatus');

  if (!categoryForm || !productForm || !categorySelect || !categoryList || !productList || !productSearch || !status) return;

  let categories = [];
  let editingCategoryId = null;
  let editingProductId = null;
  let editingOfferId = null;

  function ensureCatalogFields() {
    if (!categoryParent.id) {
      categoryParent.id = 'categoryParent';
      categoryParent.name = 'parent_id';
      categoryParent.setAttribute('aria-label', 'الفئة الرئيسية');
      categoryParent.innerHTML = '<option value="">قسم رئيسي</option>';
      categoryForm.insertBefore(categoryParent, categoryForm.elements.description);
      categoryParent.innerHTML = '<option value="">قسم رئيسي</option>';
    }

    if (!productForm.elements.offer_type) {
      const offerSelect = document.createElement('select');
      offerSelect.name = 'offer_type';
      offerSelect.setAttribute('aria-label', 'نوع المنتج');
      offerSelect.innerHTML = '<option value="none">بدون عرض</option><option value="special">عرض خاص</option>';
      productForm.insertBefore(offerSelect, productForm.elements.image_url);
    }

    if (!productForm.elements.old_price) {
      const oldPriceInput = document.createElement('input');
      oldPriceInput.name = 'old_price';
      oldPriceInput.type = 'number';
      oldPriceInput.min = '0';
      oldPriceInput.step = '0.01';
      oldPriceInput.placeholder = 'السعر القديم للعرض';
      productForm.insertBefore(oldPriceInput, productForm.elements.price);
    }

    const oldPriceInput = productForm.elements.old_price;
    const offerSelect = productForm.elements.offer_type;
    const updateOldPriceRequirement = () => {
      oldPriceInput.required = offerSelect.value === 'special';
    };
    offerSelect.addEventListener('change', updateOldPriceRequirement);
    updateOldPriceRequirement();
  }

  ensureCatalogFields();

  const setStatus = (message, isError) => {
    status.textContent = message;
    status.className = isError ? 'catalog-status error' : 'catalog-status';
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));

  const normalizeSearch = value => String(value || '').toLocaleLowerCase('ar-EG').trim();

  async function getImageUrl(file, fallback) {
    if (!file || !file.size) return fallback;
    const filePath = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const upload = await catalog.client.storage.from('product-images').upload(filePath, file, { upsert: false });
    if (upload.error) throw upload.error;
    const publicUrl = catalog.client.storage.from('product-images').getPublicUrl(filePath);
    return publicUrl.data.publicUrl;
  }

  const categoryDepth = category => {
    let depth = 0;
    let current = category;
    while (current?.parentId && depth < categories.length) {
      current = categories.find(item => String(item.id) === String(current.parentId));
      depth += 1;
    }
    return depth;
  };

  const categoryPath = category => {
    const names = [category.name];
    let current = category;
    while (current?.parentId) {
      current = categories.find(item => String(item.id) === String(current.parentId));
      if (!current) break;
      names.unshift(current.name);
    }
    return names.join(' / ');
  };

  const isDescendant = (categoryId, ancestorId) => {
    let current = categories.find(item => String(item.id) === String(categoryId));
    let steps = 0;
    while (current?.parentId && steps < categories.length) {
      if (String(current.parentId) === String(ancestorId)) return true;
      current = categories.find(item => String(item.id) === String(current.parentId));
      steps += 1;
    }
    return false;
  };

  const productEntries = () => categories.flatMap(category =>
    (category.products || []).map(product => ({ category: category, product: product }))
  );

  const discountPercent = product => {
    const oldPrice = Number(product.oldPrice);
    const price = Number(product.price);
    return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  };

  function render() {
    const categoryOptions = categories.map(category =>
      '<option value="' + escapeHtml(category.id) + '">' +
      '— '.repeat(categoryDepth(category)) + escapeHtml(category.name) + '</option>'
    ).join('');

    categorySelect.innerHTML = categoryOptions;
    if (offerCategory) {
      const previousOfferCategory = offerCategory.value;
      offerCategory.innerHTML = categoryOptions;
      if (categories.some(category => String(category.id) === String(previousOfferCategory))) {
        offerCategory.value = previousOfferCategory;
      }
    }

    categoryList.innerHTML = categories.map(category =>
      '<div class="catalog-row"><div><strong>' + escapeHtml(categoryPath(category)) + '</strong><small>' +
      escapeHtml(category.description) + ' · ' + (category.products || []).length + ' منتجات</small></div>' +
      '<div class="catalog-row-actions"><button type="button" data-edit-category="' + escapeHtml(category.id) +
      '">تعديل</button><button type="button" data-delete-category="' + escapeHtml(category.id) +
      '">حذف</button></div></div>'
    ).join('') || '<p>لا توجد فئات بعد.</p>';

    const searchTerm = normalizeSearch(productSearch.value);
    const entries = productEntries().filter(entry =>
      !searchTerm || normalizeSearch(entry.product.name).includes(searchTerm)
    );

    productList.innerHTML = entries.map(entry => {
      const product = entry.product;
      const offer = product.isSpecialOffer && Number(product.oldPrice) > Number(product.price)
        ? ' · <span class="admin-offer-discount">عرض -' + discountPercent(product) + '%</span>'
        : '';
      return '<div class="catalog-row"><div><strong>' + escapeHtml(product.name) + '</strong><small>' +
        escapeHtml(entry.category.name) + ' · ' + escapeHtml(product.price) + ' جنيه · ' +
        escapeHtml(product.unit) + ' · <span class="' + (product.isActive ? '' : 'catalog-product-unavailable') +
        '">' + (product.isActive ? 'متاح' : 'غير متاح') + '</span>' + offer + '</small></div>' +
        '<div class="catalog-row-actions"><button type="button" data-edit-product="' + escapeHtml(product.id) +
        '">تعديل</button><button type="button" data-delete-product="' + escapeHtml(product.id) +
        '">حذف</button></div></div>';
    }).join('') || '<p>لا توجد منتجات بعد.</p>';

    if (offerList) {
      const offers = productEntries().filter(entry =>
        entry.product.isSpecialOffer && Number(entry.product.oldPrice) > Number(entry.product.price)
      );
      offerList.innerHTML = offers.map(entry => {
        const product = entry.product;
        return '<div class="catalog-row admin-offer-row"><div><strong>' + escapeHtml(product.name) +
          '</strong><small>' + escapeHtml(entry.category.name) + ' · <del>' + escapeHtml(product.oldPrice) +
          ' جنيه</del> ← <strong>' + escapeHtml(product.price) + ' جنيه</strong> · <span class="admin-offer-discount">خصم ' +
          discountPercent(product) + '%</span></small></div><div class="catalog-row-actions"><button type="button" data-edit-offer="' +
          escapeHtml(product.id) + '">تعديل</button><button type="button" data-delete-offer="' + escapeHtml(product.id) +
          '">حذف</button></div></div>';
      }).join('') || '<p>لا توجد عروض مضافة بعد.</p>';
    }

    const selectableCategories = categories.filter(category =>
      !editingCategoryId ||
      (String(category.id) !== String(editingCategoryId) && !isDescendant(category.id, editingCategoryId))
    );
    const parentOptions = selectableCategories.map(category =>
      '<option value="' + escapeHtml(category.id) + '">' +
      '— '.repeat(categoryDepth(category)) + escapeHtml(category.name) + '</option>'
    ).join('');
    const previousParent = categoryParent.value;
    categoryParent.innerHTML = '<option value="">قسم رئيسي</option>' + parentOptions;
    categoryParent.value = previousParent;

    categoryList.querySelectorAll('.catalog-row').forEach((row, index) => {
      row.style.marginInlineStart = (categoryDepth(categories[index]) * 14) + 'px';
    });
  }

  function resetCategoryForm() {
    editingCategoryId = null;
    categoryForm.reset();
    categoryForm.querySelector('button[type="submit"]').textContent = 'إضافة الفئة';
    render();
  }

  function resetProductForm() {
    editingProductId = null;
    productForm.reset();
    productForm.elements.is_active.value = 'true';
    productForm.elements.offer_type.value = 'none';
    productForm.elements.old_price.required = false;
    productForm.querySelector('button[type="submit"]').textContent = 'إضافة المنتج';
  }

  function resetOfferForm() {
    if (!offerForm) return;
    editingOfferId = null;
    offerForm.reset();
    offerForm.elements.is_active.value = 'true';
    if (offerCategory && categories[0]) offerCategory.value = categories[0].id;
    offerForm.querySelector('button[type="submit"]').textContent = 'إضافة العرض';
  }

  categoryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(categoryForm));
    let imageUrl;

    try {
      imageUrl = await getImageUrl(values.image_file, String(values.image_url || '').trim());
    } catch (error) {
      setStatus(error.message, true);
      return;
    }

    const payload = {
      name: String(values.name || '').trim(),
      parent_id: values.parent_id || null,
      description: String(values.description || '').trim(),
      image_url: imageUrl,
      is_active: true
    };
    const request = editingCategoryId
      ? catalog.client.from('categories').update(payload).eq('id', editingCategoryId)
      : catalog.client.from('categories').insert(payload);
    const result = await request;

    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }

    setStatus('تم حفظ الفئة.');
    resetCategoryForm();
    await refresh();
  });

  productForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(productForm));
    const price = Number(values.price);
    const oldPrice = values.old_price === '' ? null : Number(values.old_price);

    if (values.offer_type === 'special' && !(oldPrice > price)) {
      setStatus('يجب أن يكون السعر القديم أكبر من السعر الجديد.', true);
      return;
    }

    let imageUrl;
    try {
      imageUrl = await getImageUrl(values.image_file, String(values.image_url || '').trim());
    } catch (error) {
      setStatus(error.message, true);
      return;
    }

    const payload = {
      category_id: values.category_id,
      name: String(values.name || '').trim(),
      description: String(values.description || '').trim(),
      product_type: String(values.product_type || '').trim(),
      occasion: String(values.occasion || '').trim(),
      stock_quantity: Math.max(0, Number(values.stock_quantity || 0)),
      unit: String(values.unit || '').trim(),
      price: price,
      old_price: oldPrice,
      image_url: imageUrl,
      is_active: values.is_active === 'true',
      is_special_offer: values.offer_type === 'special'
    };
    const request = editingProductId
      ? catalog.client.from('products').update(payload).eq('id', editingProductId)
      : catalog.client.from('products').insert(payload);
    const result = await request;

    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }

    setStatus('تم حفظ المنتج.');
    resetProductForm();
    await refresh();
  });

  offerForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(offerForm));
    const price = Number(values.price);
    const oldPrice = Number(values.old_price);

    if (!(oldPrice > price)) {
      setStatus('السعر القديم لازم يكون أكبر من السعر بعد الخصم.', true);
      return;
    }

    let imageUrl;
    try {
      imageUrl = await getImageUrl(values.image_file, String(values.image_url || '').trim());
    } catch (error) {
      setStatus(error.message, true);
      return;
    }

    const payload = {
      category_id: values.category_id,
      name: String(values.name || '').trim(),
      description: String(values.description || '').trim(),
      product_type: String(values.product_type || '').trim(),
      occasion: String(values.occasion || '').trim(),
      stock_quantity: Math.max(0, Number(values.stock_quantity || 0)),
      unit: String(values.unit || '').trim(),
      price: price,
      old_price: oldPrice,
      image_url: imageUrl,
      is_active: values.is_active === 'true',
      is_special_offer: true
    };
    const request = editingOfferId
      ? catalog.client.from('products').update(payload).eq('id', editingOfferId)
      : catalog.client.from('products').insert(payload);
    const result = await request;

    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }

    setStatus('تم حفظ العرض وظهر في صفحة العروض.');
    resetOfferForm();
    await refresh();
  });

  categoryList.addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-category]');
    const deleteButton = event.target.closest('[data-delete-category]');
    const editId = editButton?.dataset.editCategory;
    const deleteId = deleteButton?.dataset.deleteCategory;

    if (editId) {
      const category = categories.find(item => String(item.id) === String(editId));
      if (!category) return;
      editingCategoryId = category.id;
      categoryForm.elements.name.value = category.name;
      categoryParent.value = category.parentId || '';
      categoryForm.elements.description.value = category.description;
      categoryForm.elements.image_url.value = category.image || '';
      categoryForm.querySelector('button[type="submit"]').textContent = 'حفظ تعديل الفئة';
    }

    if (deleteId && confirm('حذف الفئة وكل منتجاتها؟')) {
      const result = await catalog.client.from('categories').delete().eq('id', deleteId);
      if (result.error) {
        setStatus(result.error.message, true);
        return;
      }
      await refresh();
    }
  });

  async function deleteProduct(productId) {
    if (!productId || !confirm('حذف المنتج؟')) return;
    const result = await catalog.client.from('products').delete().eq('id', productId);
    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }
    if (String(editingOfferId) === String(productId)) resetOfferForm();
    await refresh();
  }

  productList.addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-product]');
    const deleteButton = event.target.closest('[data-delete-product]');
    const editId = editButton?.dataset.editProduct;
    const deleteId = deleteButton?.dataset.deleteProduct;

    if (editId) {
      const entry = productEntries().find(item => String(item.product.id) === String(editId));
      if (!entry) return;
      const product = entry.product;
      editingProductId = product.id;
      productForm.elements.category_id.value = product.categoryId || entry.category.id;
      productForm.elements.name.value = product.name;
      productForm.elements.unit.value = product.unit || '';
      productForm.elements.price.value = product.price;
      productForm.elements.old_price.value = product.oldPrice ?? '';
      productForm.elements.is_active.value = product.isActive ? 'true' : 'false';
      productForm.elements.offer_type.value = product.isSpecialOffer ? 'special' : 'none';
      productForm.elements.old_price.required = product.isSpecialOffer;
      productForm.elements.image_url.value = product.image || '';
      productForm.querySelector('button[type="submit"]').textContent = 'حفظ تعديل المنتج';
    }

    if (deleteId) await deleteProduct(deleteId);
  });

  offerList?.addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-offer]');
    const deleteButton = event.target.closest('[data-delete-offer]');
    const editId = editButton?.dataset.editOffer;
    const deleteId = deleteButton?.dataset.deleteOffer;

    if (editId && offerForm) {
      const entry = productEntries().find(item => String(item.product.id) === String(editId));
      if (!entry) return;
      const product = entry.product;
      editingOfferId = product.id;
      offerForm.elements.category_id.value = product.categoryId || entry.category.id;
      offerForm.elements.name.value = product.name;
      offerForm.elements.unit.value = product.unit || '';
      offerForm.elements.price.value = product.price;
      offerForm.elements.old_price.value = product.oldPrice ?? '';
      offerForm.elements.is_active.value = product.isActive ? 'true' : 'false';
      offerForm.elements.image_url.value = product.image || '';
      offerForm.querySelector('button[type="submit"]').textContent = 'حفظ تعديل العرض';
      offerForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (deleteId) await deleteProduct(deleteId);
  });

  async function refresh() {
    try {
      await catalog.loadCatalog();
    } catch (error) {
      setStatus(error.message, true);
    }
    categories = window.marketCategoriesFlat || window.marketCategories || [];
    render();
  }

  window.addEventListener('catalog:updated', event => {
    categories = window.marketCategoriesFlat || event.detail || [];
    render();
  });

  window.addEventListener('catalog:error', event => {
    const message = event.detail?.message || '';
    if (message.includes('schema cache') || message.includes('Could not find the table')) {
      setStatus('لم يتم إنشاء جداول Supabase بعد. افتح ملف supabase-disney-schema.sql ثم supabase-disney-seed.sql وانسخ محتواهما إلى SQL Editor داخل مشروع Disney بالترتيب ثم اضغط Run.', true);
    } else {
      setStatus(message || 'تعذر الاتصال بـ Supabase.', true);
    }
  });

  document.getElementById('resetCategoryForm')?.addEventListener('click', resetCategoryForm);
  document.getElementById('resetProductForm')?.addEventListener('click', resetProductForm);
  document.getElementById('resetOfferForm')?.addEventListener('click', resetOfferForm);
  productSearch.addEventListener('input', render);
  refresh().catch(error => setStatus(error.message, true));
})();
