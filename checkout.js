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
const updateCustomer = () => {
      receiptFields.name.textContent = form.elements.customerName.value.trim() || '—';
      receiptFields.address.textContent = form.elements.customerAddress.value.trim() || '—';
      receiptFields.phone.textContent = form.elements.customerPhone.value.trim() || '—';
    };
    form.addEventListener('input', updateCustomer);
    updateCustomer();
  }
  setupReceipt();

  function renderInvoice() {
    const subtotal = cart.reduce((sum, item) => sum + itemPrice(item) * itemQuantity(item), 0);
    const total = subtotal + deliveryFee;
    if (!cart.length) {
      itemsElement.innerHTML = '<p class="invoice-empty">السلة فاضية. ارجع اختار المنتجات الأول 😊</p>';
      document.querySelector('.invoice-submit')?.setAttribute('disabled', 'disabled');
    } else {
      document.querySelector('.invoice-submit')?.removeAttribute('disabled');
      itemsElement.innerHTML = cart.map((item, index) => `
        <article class="invoice-item">
          <img src="${escapeHtml(item.img || 'https://via.placeholder.com/120')}" alt="${escapeHtml(item.name)}">
          <div class="invoice-item-info"><h3>${escapeHtml(item.name)} <button type="button" class="invoice-item-delete" data-remove-index="${index}" aria-label="حذف ${escapeHtml(item.name)}" title="حذف المنتج"><i class="fas fa-trash"></i></button></h3><small>${itemQuantity(item)} × ${money(itemPrice(item))}</small></div>
          <strong>${money(itemPrice(item) * itemQuantity(item))}</strong>
        </article>`).join('');
    }
    subtotalElement.textContent = money(subtotal);
    totalElement.textContent = money(total);
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
    const submitButton = document.querySelector('.invoice-submit');
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
