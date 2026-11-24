const STORAGE_KEY = 'bodyScentOrders';

document.addEventListener('DOMContentLoaded', () => {
  // 1. หน้า product.html
  if (document.getElementById('product-list') && document.getElementById('filter-bar')) {
    initProductPage();
  }

  // 2. หน้า order.html
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. หน้า admin.html
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

// ==========================================
// 1. PRODUCT PAGE (product.html)
// ==========================================
let allProducts = [];

function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = (urlParams.get('mood') || 'all').toLowerCase();

  renderFilterButtons(initialMood);

  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลสินค้าได้');
      return response.json();
    })
    .then(products => {
      allProducts = products;
      filterProducts(initialMood);
    })
    .catch(error => {
      console.error(error);
      const productList = document.getElementById('product-list');
      if (productList) {
        productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้</p>';
      }
    });
}

function renderFilterButtons(activeMood) {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  const moods = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'fresh', label: 'Fresh' },
    { id: 'sweet', label: 'Sweet' },
    { id: 'confident', label: 'Confident' },
    { id: 'romance', label: 'Romance' }
  ];

  const validMoods = moods.map(m => m.id);
  const currentMood = validMoods.includes(activeMood) ? activeMood : 'all';

  filterBar.innerHTML = moods.map(m => {
    const isActive = m.id === currentMood ? 'active' : '';
    const dotHtml = m.id !== 'all' ? `<span class="mood-dot"></span>` : '';
    return `
      <button type="button" class="filter-btn mood-${m.id} ${isActive}" data-mood="${m.id}">
        ${dotHtml}${m.label}
      </button>
    `;
  }).join('');

  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedMood = btn.getAttribute('data-mood');

      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      filterProducts(selectedMood);
    });
  });
}

function filterProducts(mood) {
  const validMoods = ['all', 'fresh', 'sweet', 'confident', 'romance'];
  const targetMood = validMoods.includes(mood) ? mood : 'all';

  const filtered = targetMood === 'all'
    ? allProducts
    : allProducts.filter(p => String(p.mood).toLowerCase() === targetMood);

  renderProducts(filtered);
}

function renderProducts(products) {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">ไม่พบสินค้าในหมวดหมู่นี้</p>';
    return;
  }

  productList.innerHTML = products.map(product => {
    const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;
    const moodStr = String(product.mood || '');
    const moodCapitalized = moodStr ? moodStr.charAt(0).toUpperCase() + moodStr.slice(1) : '';

    return `
      <article class="product-card mood-${escapeHtml(moodStr.toLowerCase())}">
        <div class="product-image">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="product-mood-tag">
              <span class="mood-dot"></span>${escapeHtml(moodCapitalized)}
            </span>
            <span>${escapeHtml(product.size)}</span>
          </div>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-desc">${escapeHtml(product.description || '')}</p>
          <div class="product-footer">
            <span class="product-price">฿${Number(product.price).toLocaleString()}</span>
            <a href="${orderUrl}" class="btn btn-sm">สั่งซื้อ</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================
// 2. ORDER PAGE (order.html)
// ==========================================
function initOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item') || '';
  const priceParam = urlParams.get('price') || '';

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // เติมทั้งสองช่องเสมอเมื่อโหลดหน้า
  if (itemsInput) itemsInput.value = itemParam;
  if (totalInput) totalInput.value = priceParam;

  const orderForm = document.getElementById('orderForm');
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName')?.value.trim() || '',
      contact: document.getElementById('contact')?.value.trim() || '',
      items: document.getElementById('items')?.value.trim() || '',
      total: document.getElementById('total')?.value.trim() || '',
      note: document.getElementById('note')?.value.trim() || '',
      timestamp: Date.now()
    };

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const orders = existingRaw ? JSON.parse(existingRaw) : [];
      const orderList = Array.isArray(orders) ? orders : [];

      orderList.push(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderList));

      window.location.href = 'thankyou.html';
    } catch (error) {
      console.error('Error saving order to localStorage:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง');
    }
  });
}

// ==========================================
// 3. ADMIN PAGE (admin.html)
// ==========================================
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const parsedData = rawData ? JSON.parse(rawData) : [];
    const orders = Array.isArray(parsedData) ? parsedData : [];

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">ยังไม่มีคำสั่งซื้อ</td></tr>';
      return;
    }

    // เรียงจาก timestamp ล่าสุดขึ้นก่อน
    const sortedOrders = [...orders].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    tbody.innerHTML = sortedOrders.map(order => {
      const formattedDate = order.timestamp
        ? new Date(order.timestamp).toLocaleString('th-TH')
        : '-';

      return `
        <tr>
          <td>${escapeHtml(formattedDate)}</td>
          <td>${escapeHtml(order.customerName || '-')}</td>
          <td>${escapeHtml(order.contact || '-')}</td>
          <td>${escapeHtml(order.items || '-')}</td>
          <td>${escapeHtml(order.total || '-')}</td>
          <td>${escapeHtml(order.note || '-')}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error reading orders from localStorage:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">ยังไม่มีคำสั่งซื้อ</td></tr>';
  }
}

// ป้องกัน XSS เมื่อนำข้อความมาแสดงผลใน HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}