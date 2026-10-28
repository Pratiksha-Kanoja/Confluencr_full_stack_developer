const state = {
  activeAccount: null,
  accounts: [],
  transactions: [],
  filterType: '',
  query: '',
  page: 1,
  limit: 10,
  totalPages: 1,
  totalRecords: 0,
  composer: null,
};

const formCreateAccount = document.getElementById('form-create-account');
const inputAccountName = document.getElementById('input-account-name');
const accountsContainer = document.getElementById('accounts-container');
const btnRefreshAccounts = document.getElementById('btn-refresh-accounts');

const heroAccountName = document.getElementById('hero-account-name');
const heroAccountId = document.getElementById('hero-account-id');
const heroAccountBalance = document.getElementById('hero-account-balance');
const avatarInitials = document.getElementById('avatar-initials');
const accountSwitcher = document.getElementById('account-switcher');
const btnCopyId = document.getElementById('btn-copy-id');

const formAddTx = document.getElementById('form-add-transaction');
const inputTxAmount = document.getElementById('input-tx-amount');
const inputTxRef = document.getElementById('input-tx-ref');
const inputTxDesc = document.getElementById('input-tx-desc');
const btnRandomRef = document.getElementById('btn-random-ref');

const formTransfer = document.getElementById('form-transfer');
const selectDestAccount = document.getElementById('select-dest-account');
const inputTransferAmount = document.getElementById('input-transfer-amount');
const inputTransferRef = document.getElementById('input-transfer-ref');
const inputTransferDesc = document.getElementById('input-transfer-desc');

const composer = document.getElementById('composer');
const composerTitle = document.getElementById('composer-title');
const ledgerTbody = document.getElementById('ledger-tbody');
const ledgerSearch = document.getElementById('ledger-search');
const filterPills = document.querySelectorAll('.pill');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageIndicator = document.getElementById('page-indicator');
const paginationInfo = document.getElementById('pagination-info');
const pageKicker = document.getElementById('page-kicker');

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function shortId(id) {
  return `Ending ${id.slice(-4)}`;
}

function generateRandomRef(prefix = 'REF') {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const dateStr = Date.now().toString().slice(-4);
  return `${prefix}-${rand}-${dateStr}`;
}

function setView(view) {
  document.body.dataset.view = view;
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.classList.toggle('active', button.dataset.nav === view);
  });
  if (pageKicker) {
    pageKicker.textContent = view === 'accounts' ? 'Accounts' : view === 'ledger' ? 'Transactions' : 'Overview';
  }
  document.getElementById('sidebar').classList.remove('open');
}

function openComposer(kind) {
  state.composer = kind;
  composer.hidden = false;
  const isTransfer = kind === 'transfer';
  formAddTx.hidden = isTransfer;
  formTransfer.hidden = !isTransfer;
  composerTitle.textContent = kind === 'credit' ? 'Deposit' : kind === 'debit' ? 'Withdraw' : 'Transfer funds';
  document.querySelectorAll('.action').forEach((button) => button.classList.remove('is-open'));
  const opener = document.getElementById(kind === 'credit' ? 'btn-open-credit' : kind === 'debit' ? 'btn-open-debit' : 'btn-open-transfer');
  opener.classList.add('is-open');

  if (!isTransfer) {
    const radio = document.querySelector(`input[name="tx-type"][value="${kind}"]`);
    if (radio) radio.checked = true;
    inputTxAmount.focus();
  } else {
    inputTransferAmount.focus();
  }
}

function closeComposer() {
  state.composer = null;
  composer.hidden = true;
  document.querySelectorAll('.action').forEach((button) => button.classList.remove('is-open'));
}

async function fetchAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch accounts');

    state.accounts = data.data || [];
    renderAccountsList();
    updateDestinationSelect();

    if (!state.activeAccount && state.accounts.length > 0) {
      selectAccount(state.accounts[0]);
    } else if (state.activeAccount) {
      const updated = state.accounts.find((account) => account.id === state.activeAccount.id);
      if (updated) {
        state.activeAccount = updated;
        renderActiveAccount();
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchBalance(accountId) {
  try {
    const res = await fetch(`/api/accounts/${accountId}/balance`);
    const data = await res.json();
    if (res.ok && data.data && state.activeAccount) {
      state.activeAccount.balance = data.data.balance;
      renderActiveAccount();
    }
  } catch (err) {
    console.error('Error fetching balance:', err);
  }
}

async function fetchTransactions() {
  if (!state.activeAccount) return;

  try {
    let url = `/api/accounts/${state.activeAccount.id}/transactions?page=${state.page}&limit=${state.limit}`;
    if (state.filterType) url += `&type=${state.filterType}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch transactions');

    state.transactions = data.transactions || [];
    state.totalPages = data.total_pages || 1;
    state.totalRecords = data.total_records || 0;
    renderLedger();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAccountsList() {
  renderSwitcher();

  if (state.accounts.length === 0) {
    accountsContainer.innerHTML = '<div class="empty-state">No accounts yet.</div>';
    return;
  }

  accountsContainer.innerHTML = '';
  state.accounts.forEach((account) => {
    const item = document.createElement('div');
    item.className = `account-item ${state.activeAccount && state.activeAccount.id === account.id ? 'active' : ''}`;
    item.innerHTML = `
      <div class="account-item-info">
        <span class="account-item-name">${escapeHtml(account.name)}</span>
        <span class="account-item-id">${escapeHtml(shortId(account.id))}</span>
      </div>
      <div class="account-item-balance">${formatCurrency(account.balance)}</div>
    `;
    item.addEventListener('click', () => {
      selectAccount(account);
      setView('overview');
    });
    accountsContainer.appendChild(item);
  });
}

function renderSwitcher() {
  accountSwitcher.innerHTML = '';
  if (!state.accounts.length) {
    accountSwitcher.innerHTML = '<option value="">No accounts yet</option>';
    return;
  }
  state.accounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.name}  ·  ${account.id.slice(-4)}`;
    if (state.activeAccount && account.id === state.activeAccount.id) option.selected = true;
    accountSwitcher.appendChild(option);
  });
}

function updateDestinationSelect() {
  selectDestAccount.innerHTML = '<option value="" disabled selected>Choose an account</option>';
  state.accounts.forEach((account) => {
    if (!state.activeAccount || account.id !== state.activeAccount.id) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.name} (${formatCurrency(account.balance)})`;
      selectDestAccount.appendChild(option);
    }
  });
}

function selectAccount(account) {
  state.activeAccount = account;
  state.page = 1;
  state.query = '';
  if (ledgerSearch) ledgerSearch.value = '';
  renderActiveAccount();
  renderAccountsList();
  updateDestinationSelect();
  fetchTransactions();
}

function renderActiveAccount() {
  if (!state.activeAccount) {
    heroAccountName.textContent = 'No account';
    heroAccountId.textContent = 'Select an account';
    heroAccountBalance.textContent = '$0.00';
    avatarInitials.textContent = '—';
    return;
  }

  heroAccountName.textContent = state.activeAccount.name;
  heroAccountId.textContent = shortId(state.activeAccount.id);
  heroAccountId.title = state.activeAccount.id;
  heroAccountBalance.textContent = formatCurrency(state.activeAccount.balance);
  avatarInitials.textContent = initials(state.activeAccount.name);
  renderSwitcher();
}

function visibleTransactions() {
  const query = state.query.trim().toLowerCase();
  if (!query) return state.transactions;
  return state.transactions.filter((tx) =>
    tx.reference_id.toLowerCase().includes(query) ||
    (tx.description || '').toLowerCase().includes(query)
  );
}

function renderLedger() {
  if (!state.activeAccount) {
    ledgerTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Select an account to see its history.</td></tr>';
    paginationInfo.textContent = 'Showing 0 of 0 transactions';
    return;
  }

  const rows = visibleTransactions();
  if (state.transactions.length === 0) {
    const label = state.filterType ? `${state.filterType} ` : '';
    ledgerTbody.innerHTML = `<tr><td colspan="6" class="empty-state">No ${label}transactions yet.</td></tr>`;
    paginationInfo.textContent = '0 transactions';
    btnPrevPage.disabled = true;
    btnNextPage.disabled = true;
    pageIndicator.textContent = '1 of 1';
    return;
  }

  if (rows.length === 0) {
    ledgerTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nothing on this page matches that search.</td></tr>';
  } else {
    ledgerTbody.innerHTML = '';
    rows.forEach((tx) => {
      const isCredit = tx.type === 'credit';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="cell-ref">${escapeHtml(tx.reference_id)}</td>
        <td class="cell-mono">${escapeHtml(formatWhen(tx.created_at))}</td>
        <td>${tx.description ? escapeHtml(tx.description) : '<span class="dash">—</span>'}</td>
        <td><span class="tx-badge ${tx.type}">${isCredit ? 'Credit' : 'Debit'}</span></td>
        <td class="${isCredit ? 'amount-credit' : 'amount-debit'}">${isCredit ? '+' : '−'}${formatCurrency(tx.amount)}</td>
        <td><span class="status-pill">Posted</span></td>
      `;
      ledgerTbody.appendChild(tr);
    });
  }

  const startIdx = (state.page - 1) * state.limit + 1;
  const endIdx = Math.min(state.page * state.limit, state.totalRecords);
  paginationInfo.textContent = `Showing ${startIdx}–${endIdx} of ${state.totalRecords} transactions`;
  pageIndicator.textContent = `${state.page} of ${state.totalPages || 1}`;
  btnPrevPage.disabled = state.page <= 1;
  btnNextPage.disabled = state.page >= state.totalPages;
}

formCreateAccount.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = inputAccountName.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create account');

    showToast(`${data.data.name} opened at $0.00`, 'success');
    inputAccountName.value = '';
    await fetchAccounts();
    selectAccount(data.data);
    setView('overview');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

formAddTx.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.activeAccount) {
    showToast('Select an account first', 'error');
    return;
  }

  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const amount = parseFloat(inputTxAmount.value);
  const reference_id = inputTxRef.value.trim();
  const description = inputTxDesc.value.trim();

  try {
    const res = await fetch(`/api/accounts/${state.activeAccount.id}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, reference_id, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Transaction failed');

    showToast(`${type === 'credit' ? 'Deposited' : 'Withdrew'} ${formatCurrency(amount)}`, 'success');
    inputTxAmount.value = '';
    inputTxRef.value = generateRandomRef();
    inputTxDesc.value = '';
    closeComposer();

    await fetchBalance(state.activeAccount.id);
    await fetchAccounts();
    await fetchTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

formTransfer.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.activeAccount) {
    showToast('Select a source account first', 'error');
    return;
  }

  const destination_account_id = selectDestAccount.value;
  const amount = parseFloat(inputTransferAmount.value);
  const reference_id = inputTransferRef.value.trim();
  const description = inputTransferDesc.value.trim();

  try {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_account_id: state.activeAccount.id,
        destination_account_id,
        amount,
        reference_id,
        description,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Transfer failed');

    showToast(`Sent ${formatCurrency(amount)}`, 'success');
    inputTransferAmount.value = '';
    inputTransferRef.value = generateRandomRef('TRF');
    inputTransferDesc.value = '';
    closeComposer();

    await fetchAccounts();
    await fetchBalance(state.activeAccount.id);
    await fetchTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

btnRandomRef.addEventListener('click', () => {
  inputTxRef.value = generateRandomRef();
});

btnRefreshAccounts.addEventListener('click', () => {
  fetchAccounts();
  if (state.activeAccount) fetchTransactions();
});

btnCopyId.addEventListener('click', () => {
  if (!state.activeAccount) return;
  navigator.clipboard.writeText(state.activeAccount.id);
  showToast('Account id copied', 'info');
});

document.getElementById('btn-open-credit').addEventListener('click', () => openComposer('credit'));
document.getElementById('btn-open-debit').addEventListener('click', () => openComposer('debit'));
document.getElementById('btn-open-transfer').addEventListener('click', () => openComposer('transfer'));
document.getElementById('btn-close-composer').addEventListener('click', closeComposer);

document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.nav));
});

document.getElementById('btn-nav').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

accountSwitcher.addEventListener('change', () => {
  const account = state.accounts.find((item) => item.id === accountSwitcher.value);
  if (account) selectAccount(account);
});

ledgerSearch.addEventListener('input', () => {
  state.query = ledgerSearch.value;
  renderLedger();
});

filterPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    filterPills.forEach((item) => item.classList.remove('active'));
    pill.classList.add('active');
    state.filterType = pill.dataset.filter;
    state.page = 1;
    fetchTransactions();
  });
});

btnPrevPage.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    fetchTransactions();
  }
});

btnNextPage.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    fetchTransactions();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  inputTxRef.value = generateRandomRef();
  inputTransferRef.value = generateRandomRef('TRF');
  fetchAccounts();
});
