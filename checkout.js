(function initCheckout() {
  const cart = JSON.parse(localStorage.getItem('gameCart') || '[]');
  const deliveryFee = 20;
  const itemsElement = document.getElementById('invoiceItems');
  const subtotalElement = document.getElementById('invoiceSubtotal');
  const totalElement = document.getElementById('invoiceTotal');
  const form = document.getElementById('checkoutForm');
  const errorElement = document.getElementById('checkoutError');
  const invoiceCard = document.querySelector('.invoice-card');
  const arText = (...codes) => String.fromCharCode(...codes);
  const money = value => `${Number(value || 0).toLocaleString('ar-EG')} جنيه`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
  const itemPrice = item => Number(item.priceEGP ?? item.price ?? 0);
  const itemQuantity = item => Number(item.quantity || 1);
  const orderNumber = `MO-${Date.now().toString(36).toUpperCase()}`;
  const receiptFields = {};
  let receiptMetaElement;
  let downloadButton;

  const receiptDateTime = date => `${date.toLocaleDateString('ar-EG')} - ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  const updateReceiptMeta = date => {
    if (!receiptMetaElement) return;
    receiptMetaElement.textContent = `${arText(1585, 1602, 1605, 32, 1575, 1604, 1601, 1575, 1578, 1608, 1585, 1577)}: ${orderNumber} | ${arText(1575, 1604, 1578, 1575, 1585, 1610, 1582)}: ${receiptDateTime(date)}`;
  };

  function setupReceipt() {
    if (!invoiceCard) return;
    const heading = invoiceCard.querySelector('.invoice-heading');
    const logo = document.createElement('img');
    logo.className = 'invoice-receipt-logo';
    logo.src = './Assets/disny.png';
    logo.alt = 'Disney Flower';
    heading.prepend(logo);

    const customerBox = document.createElement('div');
    customerBox.className = 'invoice-customer';
    const customerTitle = document.createElement('h3');
    customerTitle.textContent = form.querySelector('h2')?.textContent || 'بيانات العميل';
    customerBox.appendChild(customerTitle);
    const customerDetails = document.createElement('div');
    customerDetails.className = 'invoice-customer-details';
    const fields = [
      ['customerName', 'name'],
      ['customerAddress', 'address'],
      ['customerPhone', 'phone']
    ];
    fields.forEach(([inputId, fieldName]) => {
      const field = document.createElement('div');
      const label = form.querySelector(`label[for=${inputId}]`);
      const labelElement = document.createElement('span');
      labelElement.textContent = label?.textContent || inputId;
      const valueElement = document.createElement('strong');
      valueElement.textContent = '—';
      field.append(labelElement, valueElement);
      customerDetails.appendChild(field);
      receiptFields[fieldName] = valueElement;
    });
    customerBox.appendChild(customerDetails);
    invoiceCard.insertBefore(customerBox, itemsElement);

    const receiptMeta = document.createElement('div');
    receiptMeta.className = 'invoice-receipt-meta';
    receiptMetaElement = receiptMeta;
    updateReceiptMeta(new Date());
    invoiceCard.insertBefore(receiptMeta, itemsElement);

    const stamp = document.createElement('div');
    stamp.className = 'invoice-stamp';
    stamp.textContent = 'Disney';
    invoiceCard.appendChild(stamp);

    const actions = document.createElement('div');
    actions.className = 'invoice-print-actions';
    downloadButton = document.createElement('button');
    downloadButton.className = 'invoice-download-btn';
    downloadButton.type = 'button';
    const pdfIcon = document.createElement('i');
    pdfIcon.className = 'fas fa-file-pdf';
    downloadButton.appendChild(pdfIcon);
    downloadButton.appendChild(document.createTextNode(` ${arText(1578, 1581, 1605, 1610, 1604, 32, 1575, 1604, 1601, 1575, 1578, 1608, 1585, 1577)} PDF`));
    downloadButton.addEventListener('click', downloadInvoicePdf);
    actions.appendChild(downloadButton);
    invoiceCard.appendChild(actions);

    const updateCustomer = () => {
      receiptFields.name.textContent = form.elements.customerName.value.trim() || '—';
      receiptFields.address.textContent = form.elements.customerAddress.value.trim() || '—';
      receiptFields.phone.textContent = form.elements.customerPhone.value.trim() || '—';
    };
    form.addEventListener('input', updateCustomer);
    updateCustomer();
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadPdfLibrary() {
    if (!window.pdfMake) await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js');
    if (!window.__marketPdfVfsLoaded) {
      await loadScript('https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js');
      window.__marketPdfVfsLoaded = true;
    }
    return window.pdfMake;
  }

  async function loadScreenshotLibrary() {
    if (!window.htmlToImage) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js');
    return window.htmlToImage;
  }

  const imageProxyUrl = url => {
    if (!url || url.startsWith('data:') || url.startsWith(location.origin) || url.startsWith('https://images.weserv.nl/')) return url;
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  };

  async function fetchImageAsDataUrl(url) {
    if (!url || url.startsWith('data:')) return url;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(imageProxyUrl(url), {
        mode: 'cors',
        cache: 'force-cache',
        signal: controller.signal
      });
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function imageToDataUrl(url) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      return null;
    }
  }

  async function buildTextInvoicePdf() {
    const pdfMake = await loadPdfLibrary();
    const label = {
      title: '\u0645\u0644\u062e\u0635 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
      customer: '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0635\u064a\u0644',
      name: '\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',
      address: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0628\u0627\u0644\u062a\u0641\u0635\u064a\u0644',
      phone: '\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u0628\u0627\u064a\u0644',
      invoice: '\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
      date: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e',
      products: '\u0627\u0644\u0623\u0635\u0646\u0627\u0641',
      subtotal: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
      delivery: '\u0627\u0644\u062a\u0648\u0635\u064a\u0644',
      total: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0646\u0647\u0627\u0626\u064a'
    };
    const pdfMoney = value => `${Number(value || 0).toLocaleString('ar-EG')} \u062c\u0646\u064a\u0647`;
    const values = {
      name: form.elements.customerName.value.trim() || '\u2014',
      address: form.elements.customerAddress.value.trim() || '\u2014',
      phone: form.elements.customerPhone.value.trim() || '\u2014'
    };
    const subtotal = cart.reduce((sum, item) => sum + itemPrice(item) * itemQuantity(item), 0);
    const total = subtotal + deliveryFee;
    const logo = await imageToDataUrl('./Assets/disny.png');
    const productRows = await Promise.all(cart.map(async item => {
      const image = await imageToDataUrl(item.img);
      return [
        { text: pdfMoney(itemPrice(item) * itemQuantity(item)), alignment: 'left', style: 'price' },
        { stack: [
          { text: String(item.name || ''), alignment: 'right', style: 'productName' },
          { text: `${itemQuantity(item)} × ${pdfMoney(itemPrice(item))}`, alignment: 'right', style: 'muted' }
        ] },
        image ? { image, fit: [54, 54], alignment: 'right' } : { text: '' }
      ];
    }));
    const boxLayout = { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => '#8fdda9', vLineColor: () => '#8fdda9', paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 12, paddingBottom: () => 12, fillColor: () => '#f1f8ea' };
    const lineLayout = { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => '#8fdda9', vLineColor: () => '#8fdda9', paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 11, paddingBottom: () => 11 };
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [24, 24, 24, 24],
      defaultStyle: { font: 'MarketArabic', fontSize: 10, color: '#064c3a', lineHeight: 1.15 },
      styles: {
        brand: { fontSize: 11, bold: true, color: '#087f5b' },
        title: { fontSize: 20, bold: true, color: '#064c3a' },
        section: { fontSize: 13, bold: true, color: '#087f5b' },
        meta: { fontSize: 9, color: '#60746f' },
        productName: { fontSize: 11, bold: true, color: '#064c3a' },
        price: { fontSize: 11, bold: true, color: '#087f5b' },
        muted: { fontSize: 9, color: '#315950' },
        total: { fontSize: 13, bold: true, color: '#087f5b' },
        stamp: { fontSize: 11, bold: true, color: '#087f5b' }
      },
      content: [
        { columns: [
          { width: '*', stack: [{ text: 'Disney', style: 'brand', alignment: 'right' }, { text: label.title, style: 'title', alignment: 'right' }] },
          logo ? { width: 54, image: logo, fit: [48, 48], alignment: 'right' } : { width: 54, text: '' }
        ], columnGap: 10, margin: [0, 0, 0, 8] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 547, y2: 0, lineWidth: 0.7, lineColor: '#8fdda9' }], margin: [0, 0, 0, 10] },
        { table: { widths: ['*', 125], body: [
          [{ text: label.customer, colSpan: 2, alignment: 'right', style: 'section' }, {}],
          [{ text: values.name, alignment: 'left' }, { text: label.name, alignment: 'right' }],
          [{ text: values.address, alignment: 'left' }, { text: label.address, alignment: 'right' }],
          [{ text: values.phone, alignment: 'left' }, { text: label.phone, alignment: 'right' }]
        ] }, layout: boxLayout, margin: [0, 0, 0, 8] },
        { text: `${label.invoice}: ${orderNumber} | ${label.date}: ${receiptDateTime(new Date())}`, alignment: 'right', style: 'meta', margin: [0, 0, 0, 10] },
        { table: { widths: [78, '*', 64], body: productRows }, layout: lineLayout, dontBreakRows: true, margin: [0, 0, 0, 10] },
        { table: { widths: ['*', 170], body: [
          [{ text: pdfMoney(subtotal), alignment: 'left' }, { text: label.subtotal, alignment: 'right' }],
          [{ text: pdfMoney(deliveryFee), alignment: 'left' }, { text: label.delivery, alignment: 'right' }],
          [{ text: pdfMoney(total), alignment: 'left', style: 'total' }, { text: label.total, alignment: 'right', style: 'total' }]
        ] }, layout: lineLayout, margin: [0, 0, 0, 12] },
        { text: 'Disney', alignment: 'center', style: 'stamp' }
      ]
    };
    const blob = await new Promise(resolve => pdfMake.createPdf(docDefinition).getBlob(resolve));
    return new File([blob], `${orderNumber}.pdf`, { type: 'application/pdf' });
  }

  async function buildInvoicePdf() {
    const htmlToImage = await loadScreenshotLibrary();
    const pdfMake = await loadPdfLibrary();
    if (document.fonts?.ready) await document.fonts.ready;
    const cardRect = invoiceCard.getBoundingClientRect();
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-100000px;top:0;width:${Math.ceil(cardRect.width)}px;z-index:-1;pointer-events:none;`;
    const source = invoiceCard.cloneNode(true);
    source.style.width = `${Math.ceil(cardRect.width)}px`;
    source.style.maxWidth = `${Math.ceil(cardRect.width)}px`;
    source.style.margin = '0';
    source.querySelector('.invoice-print-actions')?.remove();
    source.querySelectorAll('.invoice-item-delete').forEach(button => button.remove());

    const originalImages = Array.from(invoiceCard.querySelectorAll('img'));
    const captureImages = Array.from(source.querySelectorAll('img'));
    const waitForImage = image => new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        image.onload = null;
        image.onerror = null;
        resolve();
      };
      if (image.complete) {
        finish();
        return;
      }
      image.onload = finish;
      image.onerror = finish;
      setTimeout(finish, 10000);
    });
    await Promise.all(captureImages.map(async (image, index) => {
      const originalUrl = originalImages[index]?.currentSrc || originalImages[index]?.src || image.src;
      const embeddedImage = await fetchImageAsDataUrl(originalUrl);
      if (embeddedImage) image.src = embeddedImage;
      else image.removeAttribute('src');
      image.removeAttribute('crossorigin');
    }));

    host.appendChild(source);
    document.body.appendChild(host);
    try {
      await Promise.all(captureImages.map(waitForImage));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const image = await htmlToImage.toPng(source, {
        pixelRatio: 2,
        cacheBust: false,
        backgroundColor: '#fffaf0',
        filter: node => !node.classList?.contains('invoice-print-actions') && !node.classList?.contains('invoice-item-delete')
      });
      const imageSize = await new Promise(resolve => {
        const preview = new Image();
        preview.onload = () => resolve({ width: preview.naturalWidth, height: preview.naturalHeight });
        preview.onerror = () => resolve({ width: source.scrollWidth * 2, height: source.scrollHeight * 2 });
        preview.src = image;
      });
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const maxWidth = pageWidth - 20;
      const maxHeight = pageHeight - 20;
      const ratio = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height);
      const width = imageSize.width * ratio;
      const height = imageSize.height * ratio;
      const blob = await new Promise(resolve => pdfMake.createPdf({
        pageSize: 'A4',
        pageMargins: [0, 0, 0, 0],
        content: [{ image, width, height, margin: [(pageWidth - width) / 2, (pageHeight - height) / 2, 0, 0] }]
      }).getBlob(resolve));
      return new File([blob], `${orderNumber}.pdf`, { type: 'application/pdf' });
    } finally {
      host.remove();
    }
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadInvoicePdf() {
    if (!cart.length || !invoiceCard) return;
    downloadButton.disabled = true;
    downloadButton.classList.add('is-loading');
    updateReceiptMeta(new Date());
    errorElement.textContent = '';
    try {
      const file = await buildInvoicePdf();
      downloadFile(file);
    } catch (error) {
      errorElement.textContent = arText(1578, 1593, 1584, 1585, 32, 1578, 1580, 1607, 1610, 1586, 32, 1605, 1604, 1601, 32, 80, 68, 70);
      console.error('Invoice PDF download failed', error);
    } finally {
      downloadButton.disabled = false;
      downloadButton.classList.remove('is-loading');
    }
  }

  async function shareInvoiceFile(file, message) {
    const canShareFile = typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [file] });
    if (!canShareFile) return false;
    try {
      await navigator.share({ title: 'Disney', text: message, files: [file] });
      return true;
    } catch (error) {
      return false;
    }
  }

  setupReceipt();

  function renderInvoice() {
    const subtotal = cart.reduce((sum, item) => sum + itemPrice(item) * itemQuantity(item), 0);
    const total = subtotal + deliveryFee;
    if (!cart.length) {
      itemsElement.innerHTML = '<p class="invoice-empty">السلة فاضية. ارجع اختار المنتجات الأول 😊</p>';
      form.querySelector('button').disabled = true;
    } else {
      form.querySelector('button').disabled = false;
      itemsElement.innerHTML = cart.map((item, index) => `
        <article class="invoice-item">
          <img src="${escapeHtml(item.img || 'https://via.placeholder.com/120')}" alt="${escapeHtml(item.name)}">
          <div class="invoice-item-info"><h3>${escapeHtml(item.name)} <button type="button" class="invoice-item-delete" data-remove-index="${index}" aria-label="حذف ${escapeHtml(item.name)}" title="حذف المنتج"><i class="fas fa-trash"></i></button></h3><small>${itemQuantity(item)} × ${money(itemPrice(item))}</small></div>
          <strong>${money(itemPrice(item) * itemQuantity(item))}</strong>
        </article>`).join('');
    }
    subtotalElement.textContent = money(subtotal);
    totalElement.textContent = money(total);
    if (downloadButton) downloadButton.disabled = !cart.length;
  }

  itemsElement.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-index]');
    if (!removeButton) return;
    cart.splice(Number(removeButton.dataset.removeIndex), 1);
    localStorage.setItem('gameCart', JSON.stringify(cart));
    renderInvoice();
  });

  renderInvoice();

    form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!cart.length) return;
    const values = Object.fromEntries(new FormData(form));
    const phone = values.customerPhone.trim();
    if (!/^01[0-2,5][0-9]{8}$/.test(phone.replace(/[ -]/g, ''))) {
      errorElement.textContent = 'اكتب رقم موبايل مصري صحيح من فضلك.';
      return;
    }
    errorElement.textContent = '';
    const subtotal = cart.reduce((sum, item) => sum + itemPrice(item) * itemQuantity(item), 0);
    const total = subtotal + deliveryFee;
    const submitButton = form.querySelector('.checkout-submit');
    submitButton.disabled = true;
    const lines = cart.map(item => `• ${item.name} × ${itemQuantity(item)} = ${money(itemPrice(item) * itemQuantity(item))}`).join('\n');
    const sentAt = new Date();
    updateReceiptMeta(sentAt);
    const message = `السلام عليكم، عايز أأكد الطلب ده من Disney:\n\nرقم الطلب: ${orderNumber}\nاسم العميل: ${values.customerName}\nالعنوان: ${values.customerAddress}\nرقم الموبايل: ${phone}${values.giftMessage ? `\nرسالة الإهداء: ${values.giftMessage}` : ''}${values.deliveryDate ? `\nتاريخ التوصيل: ${values.deliveryDate}` : ''}${values.deliverySlot ? `\nالفترة: ${values.deliverySlot}` : ''}${values.deliveryInstructions ? `\nتعليمات: ${values.deliveryInstructions}` : ''}\nالتاريخ والوقت: ${receiptDateTime(sentAt)}\n\nالأصناف:\n${lines}\n\nإجمالي المنتجات: ${money(subtotal)}\nالتوصيل: ${money(deliveryFee)}\nالإجمالي النهائي: ${money(total)}`;
    window.open(`https://wa.me/201004896232?text=${encodeURIComponent(message)}`, '_blank');
    localStorage.removeItem('gameCart');
    submitButton.disabled = false;
  });
})();
