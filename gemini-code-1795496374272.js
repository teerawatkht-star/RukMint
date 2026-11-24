// ==========================================
// CONFIGURATION (นำ URL จริงมาวางแทนที่ตรงนี้)
// ==========================================
const APPS_SCRIPT_URL = '[APPS_SCRIPT_URL]';
const CSV_URL = '[CSV_URL]';

document.addEventListener('DOMContentLoaded', () => {
  // 1. ตรวจสอบหน้า product.html
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  // 2. ตรวจสอบหน้า order.html
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. ตรวจสอบหน้า admin.html
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

  filterBar.innerHTML = moods.map(m => {
    const isActive = m.id === activeMood ? 'active' : '';
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
    : allProducts.filter(p => p.mood.toLowerCase() === targetMood);

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
    const moodCapitalized = product.mood.charAt(0).toUpperCase() + product.mood.slice(1);

    return `
      <article class="product-card mood-${escapeHtml(product.mood)}">
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
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // เติมชื่อสินค้าและราคาลงในฟอร์มอัตโนมัติทันทีที่โหลดหน้า
  if (itemParam && itemsInput) {
    itemsInput.value = itemParam;
  }
  if (priceParam && totalInput) {
    totalInput.value = priceParam;
  }

  const orderForm = document.getElementById('orderForm');
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังส่งคำสั่งซื้อ...';
    }

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
  });
}

// ==========================================
// 3. ADMIN PAGE (admin.html)
// ==========================================
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>';

  fetch(CSV_URL)
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูล CSV ได้');
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText);

      // ตัดแถวหัวตาราง (index 0) ออก และกรองแถวว่าง
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

      if (dataRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">ยังไม่มีรายการคำสั่งซื้อ</td></tr>';
        return;
      }

      // เรียงจากรายการล่าสุดขึ้นก่อน
      const latestFirstRows = dataRows.reverse();

      tbody.innerHTML = latestFirstRows.map(row => `
        <tr>
          <td>${escapeHtml(row[0] || '-')}</td>
          <td>${escapeHtml(row[1] || '-')}</td>
          <td>${escapeHtml(row[2] || '-')}</td>
          <td>${escapeHtml(row[3] || '-')}</td>
          <td>${escapeHtml(row[4] || '-')}</td>
          <td>${escapeHtml(row[5] || '-')}</td>
        </tr>
      `).join('');
    })
    .catch(error => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--mood-romance);">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>';
    });
}

// ฟังก์ชัน Parse CSV เอง (รองรับเครื่องหมายคำพูด "..." และลูกน้ำหรือการขึ้นบรรทัดใหม่ภายในช่อง)
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      if (char === '\r') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
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