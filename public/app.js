// Frontend Dashboard Logic for Banco BHD Transaction Tracker
let currentPage = 1;
const PAGE_LIMIT = 20;

const state = {
  month: '',
  category: '',
  currency: '',
  search: '',
  page: 1,
};

// Templates for simulator
const templates = {
  bravo: {
    externalId: `bhd_msg_${Date.now()}`,
    cardLast4: '0380',
    cardType: 'Visa Débito Intl',
    rawMerchant: 'SM BRAVO LAS AMERICAS',
    amount: 1530.0,
    currency: 'DOP',
    status: 'Aprobada',
    transactionType: 'Compra',
    transactionDate: new Date().toISOString(),
    source: 'BHD_EMAIL',
  },
  pedidosya: {
    externalId: `bhd_msg_${Date.now() + 1}`,
    cardLast4: '0380',
    cardType: 'Visa Débito Intl',
    rawMerchant: 'PEDIDOSYA *REST EL CONDE',
    amount: 875.5,
    currency: 'DOP',
    status: 'Aprobada',
    transactionType: 'Compra',
    transactionDate: new Date().toISOString(),
    source: 'BHD_EMAIL',
  },
  uber: {
    externalId: `bhd_msg_${Date.now() + 2}`,
    cardLast4: '1234',
    cardType: 'Mastercard Crédito',
    rawMerchant: 'UBER *TRIP SANTO DOMINGO',
    amount: 345.0,
    currency: 'DOP',
    status: 'Aprobada',
    transactionType: 'Compra',
    transactionDate: new Date().toISOString(),
    source: 'BHD_EMAIL',
  },
  netflix: {
    externalId: `bhd_msg_${Date.now() + 3}`,
    cardLast4: '1234',
    cardType: 'Mastercard Crédito',
    rawMerchant: 'NETFLIX.COM INTERNET',
    amount: 15.99,
    currency: 'USD',
    status: 'Aprobada',
    transactionType: 'Compra',
    transactionDate: new Date().toISOString(),
    source: 'BHD_EMAIL',
  },
  gas: {
    externalId: `bhd_msg_${Date.now() + 4}`,
    cardLast4: '0380',
    cardType: 'Visa Débito Intl',
    rawMerchant: 'ESTACION TOTALENERGIES NITA',
    amount: 2500.0,
    currency: 'DOP',
    status: 'Aprobada',
    transactionType: 'Compra',
    transactionDate: new Date().toISOString(),
    source: 'BHD_EMAIL',
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Set default month to current month YYYY-MM
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('monthFilter').value = currentMonthStr;
  state.month = currentMonthStr;

  setupEventListeners();
  loadDashboardData();
  loadTemplate('bravo');
});

function setupEventListeners() {
  // Filters
  document.getElementById('monthFilter').addEventListener('change', (e) => {
    state.month = e.target.value;
    state.page = 1;
    loadDashboardData();
  });

  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    state.category = e.target.value;
    state.page = 1;
    loadTransactions();
  });

  document.getElementById('currencyFilter').addEventListener('change', (e) => {
    state.currency = e.target.value;
    state.page = 1;
    loadTransactions();
  });

  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadTransactions();
    }, 300);
  });

  document.getElementById('btnResetFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('currencyFilter').value = '';
    state.search = '';
    state.category = '';
    state.currency = '';
    state.page = 1;
    loadTransactions();
  });

  // Pagination
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadTransactions();
    }
  });

  document.getElementById('btnNextPage').addEventListener('click', () => {
    state.page++;
    loadTransactions();
  });

  // Exports
  document.getElementById('btnExportCsv').addEventListener('click', () => {
    const params = new URLSearchParams({
      format: 'csv',
      ...(state.month && { month: state.month }),
      ...(state.category && { category: state.category }),
      ...(state.currency && { currency: state.currency }),
    });
    window.location.href = `/api/v1/transactions/export?${params.toString()}`;
  });

  document.getElementById('btnExportJson').addEventListener('click', () => {
    const params = new URLSearchParams({
      format: 'json',
      ...(state.month && { month: state.month }),
      ...(state.category && { category: state.category }),
      ...(state.currency && { currency: state.currency }),
    });
    window.location.href = `/api/v1/transactions/export?${params.toString()}`;
  });

  // Modals
  const simModal = document.getElementById('simulatorModal');
  const rulesModal = document.getElementById('rulesModal');

  document.getElementById('btnOpenSimulator').addEventListener('click', () => {
    simModal.classList.add('active');
  });

  document.getElementById('btnCloseSimulator').addEventListener('click', () => {
    simModal.classList.remove('active');
  });

  document.getElementById('btnOpenRules').addEventListener('click', () => {
    rulesModal.classList.add('active');
    loadRules();
  });

  document.getElementById('btnCloseRules').addEventListener('click', () => {
    rulesModal.classList.remove('active');
  });

  document.getElementById('btnGenerateId').addEventListener('click', () => {
    try {
      const payload = JSON.parse(document.getElementById('simPayload').value);
      payload.externalId = `bhd_msg_${Date.now()}`;
      payload.transactionDate = new Date().toISOString();
      document.getElementById('simPayload').value = JSON.stringify(payload, null, 2);
    } catch {
      // ignore
    }
  });

  document.getElementById('btnSendSimulation').addEventListener('click', sendSimulation);

  // Add rule form
  document.getElementById('addRuleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pattern = document.getElementById('rulePattern').value.trim();
    const normalizedMerchant = document.getElementById('ruleMerchant').value.trim();
    const category = document.getElementById('ruleCategory').value;

    try {
      const res = await fetch('/api/v1/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'bhd_secret_token_123456',
        },
        body: JSON.stringify({ pattern, normalizedMerchant, category }),
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('rulePattern').value = '';
        document.getElementById('ruleMerchant').value = '';
        loadRules();
      } else {
        alert('Error creando regla: ' + (data.error || data.message));
      }
    } catch (err) {
      alert('Error en conexión: ' + err.message);
    }
  });
}

function loadTemplate(key) {
  if (templates[key]) {
    const t = { ...templates[key], externalId: `bhd_${Date.now()}`, transactionDate: new Date().toISOString() };
    document.getElementById('simPayload').value = JSON.stringify(t, null, 2);
  }
}

async function sendSimulation() {
  const resultBox = document.getElementById('simulatorResult');
  resultBox.className = 'sim-result-box';
  resultBox.textContent = 'Enviando...';
  resultBox.classList.remove('hidden');

  try {
    const payload = JSON.parse(document.getElementById('simPayload').value);
    const res = await fetch('/api/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'bhd_secret_token_123456',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    resultBox.textContent = JSON.stringify(data, null, 2);

    if (res.status === 201) {
      resultBox.classList.add('success');
    } else if (res.status === 200 && data.duplicate) {
      resultBox.classList.add('duplicate');
    } else {
      resultBox.classList.add('error');
    }

    loadDashboardData();
  } catch (err) {
    resultBox.classList.add('error');
    resultBox.textContent = 'Error parsing JSON or sending request: ' + err.message;
  }
}

async function loadDashboardData() {
  await Promise.all([loadStats(), loadTransactions()]);
}

async function loadStats() {
  try {
    const params = new URLSearchParams();
    if (state.month) params.append('month', state.month);

    const res = await fetch(`/api/v1/stats/summary?${params.toString()}`);
    const json = await res.json();

    if (json.success && json.data) {
      const d = json.data;
      document.getElementById('kpiTotalDop').textContent = `RD$ ${d.totalSpentDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiTotalUsd').textContent = `US$ ${d.totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('kpiTotalCount').textContent = d.totalTransactions;

      const breakdown = d.categoryBreakdown || {};
      const categories = Object.entries(breakdown);

      if (categories.length > 0) {
        // Find top category by DOP
        categories.sort((a, b) => b[1].totalDOP - a[1].totalDOP);
        const [topName, topData] = categories[0];
        document.getElementById('kpiTopCategory').textContent = topName;
        document.getElementById('kpiTopCategoryAmount').textContent = `RD$ ${topData.totalDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      } else {
        document.getElementById('kpiTopCategory').textContent = 'Sin Gastos';
        document.getElementById('kpiTopCategoryAmount').textContent = 'RD$ 0.00';
      }

      renderCategoryBars(breakdown, d.totalSpentDOP);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function getCategoryColor(cat) {
  const map = {
    Supermercado: '#10b981',
    'Restaurantes & Delivery': '#f59e0b',
    Transporte: '#3b82f6',
    Combustible: '#f97316',
    'Salud & Farmacia': '#ec4899',
    Servicios: '#8b5cf6',
    Suscripciones: '#e11d48',
    Tecnología: '#06b6d4',
    'Compras Online': '#0ea5e9',
    Hogar: '#eab308',
  };
  return map[cat] || '#6b7280';
}

function getCategoryBadgeClass(cat) {
  const map = {
    Supermercado: 'badge-cat-supermercado',
    'Restaurantes & Delivery': 'badge-cat-restaurantes',
    Transporte: 'badge-cat-transporte',
    Combustible: 'badge-cat-combustible',
    'Salud & Farmacia': 'badge-cat-salud',
    Servicios: 'badge-cat-servicios',
    Suscripciones: 'badge-cat-suscripciones',
    Tecnología: 'badge-cat-tecnologia',
    'Compras Online': 'badge-cat-compras',
  };
  return map[cat] || 'badge-cat-default';
}

function renderCategoryBars(breakdown, totalDOP) {
  const container = document.getElementById('categoryBarsContainer');
  const items = Object.entries(breakdown);

  if (items.length === 0 || totalDOP === 0) {
    container.innerHTML = '<div class="empty-state-mini">No hay gastos registrados en este período.</div>';
    return;
  }

  items.sort((a, b) => b[1].totalDOP - a[1].totalDOP);

  container.innerHTML = items
    .map(([cat, data]) => {
      const percent = totalDOP > 0 ? Math.round((data.totalDOP / totalDOP) * 100) : 0;
      const color = getCategoryColor(cat);
      return `
      <div class="category-bar-item">
        <div class="cat-bar-header">
          <span class="cat-bar-name">${cat} (${data.count})</span>
          <span class="cat-bar-amt">RD$ ${data.totalDOP.toLocaleString('es-DO', { minimumFractionDigits: 2 })} (${percent}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percent}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

async function loadTransactions() {
  const tbody = document.getElementById('transactionsTbody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6">Cargando transacciones...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: state.page,
      limit: PAGE_LIMIT,
      ...(state.month && { month: state.month }),
      ...(state.category && { category: state.category }),
      ...(state.currency && { currency: state.currency }),
      ...(state.search && { search: state.search }),
    });

    const res = await fetch(`/api/v1/transactions?${params.toString()}`);
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-muted">No se encontraron transacciones.</td></tr>';
      updatePagination(0, 0, 1);
      return;
    }

    tbody.innerHTML = json.data
      .map((t) => {
        const date = new Date(t.transactionDate);
        const formattedDate = date.toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const currencySymbol = t.currency === 'USD' ? 'US$' : 'RD$';
        const amountClass = t.currency === 'USD' ? 'amount-usd' : 'amount-dop';
        const catBadgeClass = getCategoryBadgeClass(t.category);

        return `
        <tr>
          <td>${formattedDate}</td>
          <td class="merchant-cell">${t.merchant}</td>
          <td class="raw-merchant-cell">${t.rawMerchant}</td>
          <td><span class="badge ${catBadgeClass}">${t.category}</span></td>
          <td>${t.cardLast4 ? `**** ${t.cardLast4}` : 'N/A'}</td>
          <td class="amount-cell ${amountClass}">${currencySymbol} ${t.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          <td><span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span></td>
          <td>
            <button class="btn btn-xs btn-outline" onclick="deleteTransaction('${t.id}')" title="Eliminar"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>
      `;
      })
      .join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }

    updatePagination(json.pagination.totalItems, json.pagination.totalPages, json.pagination.page);
  } catch (err) {
    console.error('Error loading transactions:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-danger">Error: ${err.message}</td></tr>`;
  }
}

function updatePagination(totalItems, totalPages, page) {
  document.getElementById('paginationInfo').textContent = `Total: ${totalItems} transacciones (Página ${page} de ${totalPages || 1})`;
  document.getElementById('pageCurrent').textContent = page;
  document.getElementById('btnPrevPage').disabled = page <= 1;
  document.getElementById('btnNextPage').disabled = page >= totalPages;
}

async function deleteTransaction(id) {
  if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;
  try {
    const res = await fetch(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      loadDashboardData();
    }
  } catch (err) {
    alert('Error eliminando: ' + err.message);
  }
}

async function loadRules() {
  const container = document.getElementById('rulesList');
  container.innerHTML = 'Cargando...';

  try {
    const res = await fetch('/api/v1/rules');
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = '<div class="empty-state-mini">No hay reglas personalizadas. Se usan las reglas del sistema por defecto.</div>';
      return;
    }

    container.innerHTML = json.data
      .map(
        (r) => `
      <div class="rule-item">
        <div>
          <strong>${r.pattern}</strong> &rarr; <span>${r.normalizedMerchant}</span>
          <span class="badge badge-cat-default" style="margin-left: 8px;">${r.category}</span>
        </div>
        <button class="btn btn-xs btn-outline" onclick="deleteRule('${r.id}')"><i data-lucide="trash"></i></button>
      </div>
    `
      )
      .join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = 'Error cargando reglas: ' + err.message;
  }
}

async function deleteRule(id) {
  if (!confirm('¿Eliminar regla?')) return;
  try {
    const res = await fetch(`/api/v1/rules/${id}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': 'bhd_secret_token_123456',
      },
    });
    if (res.ok) loadRules();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
