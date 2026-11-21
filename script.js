const STORAGE_KEY  = 'dragonix_history';
const HISTORY_LIMIT = 20;

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', dexName: 'Uniswap', dexUrl: (a) => `https://app.uniswap.org/#/swap?outputCurrency=${a}` },
  { id: 'bsc', name: 'BNB Chain', dexName: 'PancakeSwap', dexUrl: (a) => `https://pancakeswap.finance/swap?outputCurrency=${a}` },
  { id: 'polygon', name: 'Polygon', dexName: 'Uniswap', dexUrl: (a) => `https://app.uniswap.org/#/swap?outputCurrency=${a}&chain=polygon` },
  { id: 'arbitrum', name: 'Arbitrum', dexName: 'Uniswap', dexUrl: (a) => `https://app.uniswap.org/#/swap?outputCurrency=${a}&chain=arbitrum` },
  { id: 'solana', name: 'Solana', dexName: 'Jupiter', dexUrl: (a) => `https://jup.ag/swap/SOL-${a}` }
];

const DEMO_TOKENS = {
  '0x1111111111111111111111111111111111111111': {
    name: 'Demo Safe Token',
    symbol: 'SAFE',
    decimals: 18,
    totalSupply: '100,000,000',
    liquidityStatus: 'healthy',
    holderStatus: 'healthy',
    contractStatus: 'verified',
    age: 'mature',
  },
  '0x2222222222222222222222222222222222222222': {
    name: 'Demo Warning Token',
    symbol: 'WARN',
    decimals: 18,
    totalSupply: '500,000,000',
    liquidityStatus: 'low',
    holderStatus: 'concentrated',
    contractStatus: 'verified',
    age: 'new',
  },
  '0x3333333333333333333333333333333333333333': {
    name: 'Demo High Risk Token',
    symbol: 'RISK',
    decimals: 18,
    totalSupply: '1,000,000,000,000',
    liquidityStatus: 'very-low',
    holderStatus: 'concentrated',
    contractStatus: 'unverified',
    age: 'new',
  },
};

const els = {
  chainSelect:   document.getElementById('chain-select'),
  addressInput:  document.getElementById('address-input'),
  checkBtn:      document.getElementById('check-btn'),
  errorMessage:  document.getElementById('error-message'),
  resultSection: document.getElementById('result-section'),
  historyList:   document.getElementById('history-list'),
  clearHistory:  document.getElementById('clear-history-btn'),
  footerYear:    document.getElementById('footer-year'),
};

// UTILITIES 
function createSeededRandom(seedString) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = (Math.imul(31, h) + seedString.charCodeAt(i)) | 0;
  }
  return function () {
    h = (Math.imul(1103515245, h) + 12345) | 0;
    return (h >>> 0) / 4294967296;
  };
}

function shortAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function getChain(chainId) {
  return CHAINS.find((c) => c.id === chainId) || CHAINS[0];
}

// ---------- MOCK DATA ----------

function generateMockToken(address) {
  const rng = createSeededRandom(address.toLowerCase());
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const names   = ['Moon Rocket', 'Dragon Coin', 'Safe Yield', 'Meta Galaxy',
                   'Tiny Token', 'Pixel Coin', 'Star Finance', 'Nova Asset'];
  const symbols = ['MOON', 'DRG', 'YLD', 'META', 'TNY', 'PIX', 'STR', 'NVA'];

  const liquidityOptions = ['healthy', 'healthy', 'healthy', 'low', 'very-low'];
  const holderOptions    = ['healthy', 'healthy', 'healthy', 'concentrated'];
  const contractOptions  = ['verified', 'verified', 'verified', 'unverified'];
  const ageOptions       = ['mature', 'mature', 'mature', 'new'];

  const supply = Math.floor(rng() * 999_000_000 + 1_000_000);

  return {
    name:           pick(names),
    symbol:         pick(symbols),
    decimals:       pick([6, 8, 9, 18]),
    totalSupply:    supply.toLocaleString('en-US'),
    liquidityStatus: pick(liquidityOptions),
    holderStatus:    pick(holderOptions),
    contractStatus:  pick(contractOptions),
    age:             pick(ageOptions),
  };
}

async function fetchTokenData(chainId, address) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const key = address.toLowerCase();

  if (DEMO_TOKENS[key]) {
    return { ...DEMO_TOKENS[key] };
  }
  return generateMockToken(key);
}

// VALIDATION

function validateAddress(rawAddress, chainId) {
  const address = (rawAddress || '').trim();
  if (!address) return { valid: false, message: 'Please paste a token contract address first.' };

  if (chainId === 'solana') {
    // Validasi sederhana alamat Solana
    if (address.length < 32 || address.length > 44) {
      return { valid: false, message: 'Invalid Solana address format.' };
    }
  } else {
    // Validasi EVM (0x + 40 hex)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { valid: false, message: 'Invalid EVM address. It should start with 0x followed by 40 hex characters.' };
    }
  }
  return { valid: true, address: address };
}

// RISK ANALYSIS

function analyzeRisk(token) {
  const factors = [];
  let score = 0;

  if (token.liquidityStatus === 'healthy') {
    factors.push({ type: 'positive', message: 'Liquidity looks healthy.' });
  } else if (token.liquidityStatus === 'low') {
    factors.push({ type: 'warning', message: 'Low liquidity. Price may swing sharply.' });
    score += 25;
  } else if (token.liquidityStatus === 'very-low') {
    factors.push({ type: 'critical', message: 'Very low liquidity. Selling may be difficult.' });
    score += 40;
  }

  if (token.holderStatus === 'healthy') {
    factors.push({ type: 'positive', message: 'Holder distribution is healthy.' });
  } else if (token.holderStatus === 'concentrated') {
    factors.push({ type: 'warning', message: 'A small number of wallets own most of the supply.' });
    score += 25;
  }

  if (token.contractStatus === 'verified') {
    factors.push({ type: 'positive', message: 'Contract source is verified.' });
  } else if (token.contractStatus === 'unverified') {
    factors.push({ type: 'critical', message: 'Contract source is not verified.' });
    score += 30;
  }

  if (token.age === 'new') {
    factors.push({ type: 'warning', message: 'Token is very new. Limited history.' });
    score += 15;
  }

  score = Math.min(score, 100);

  let level;
  if (score <= 25)      level = 'safe';
  else if (score <= 50) level = 'warning';
  else                  level = 'high';

  return { score, level, factors };
}

// UI HELPERS 

function setLoading(isLoading) {
  const btn      = els.checkBtn;
  const textNode = btn.querySelector('.btn-text');
  const spinner  = btn.querySelector('.btn-spinner');

  btn.disabled = isLoading;
  textNode.textContent = isLoading ? 'Checking...' : 'Check Token';
  spinner.classList.toggle('hidden', !isLoading);
}

function showError(message) {
  els.errorMessage.textContent = message;
  els.errorMessage.classList.remove('hidden');
  els.errorMessage.classList.remove('shake');
  void els.errorMessage.offsetWidth;
  els.errorMessage.classList.add('shake');
}

function hideError() {
  els.errorMessage.textContent = '';
  els.errorMessage.classList.add('hidden');
}

const LEVEL_STYLES = {
  safe: {
    label: 'SAFE',
    badge: 'bg-white text-black border-gray-500',
    bar:   'bg-white',
    text:  'text-white',
  },
  warning: {
    label: 'WARNING',
    badge: 'bg-gray-400 text-black border-gray-500',
    bar:   'bg-gray-400',
    text:  'text-gray-400',
  },
  high: {
    label: 'HIGH RISK',
    badge: 'bg-purple-900 text-white border-purple-700',
    bar:   'bg-purple-900',
    text:  'text-purple-400',
  },
  unknown: {
    label: 'UNKNOWN',
    badge: 'bg-gray-800 text-gray-400 border-gray-700',
    bar:   'bg-gray-600',
    text:  'text-gray-400',
  },
};

const FACTOR_ICONS = {
  positive: 'OK',
  warning:  '!',
  critical: 'X',
};

const FACTOR_COLORS = {
  positive: 'text-white',
  warning:  'text-gray-400',
  critical: 'text-purple-400',
};

function renderResult({ chainId, address, token, risk }) {
  const chain       = getChain(chainId);
  const level       = LEVEL_STYLES[risk.level] || LEVEL_STYLES.unknown;
  const dexUrl      = chain.dexUrl(address);
  const initial     = (token.symbol || '?').charAt(0).toUpperCase();

  const factorItems = risk.factors
    .map((f) => `
      <li class="flex items-start gap-2 text-sm">
        <span class="font-bold ${FACTOR_COLORS[f.type] || 'text-gray-400'} w-6">
          ${FACTOR_ICONS[f.type] || '-'}
        </span>
        <span class="text-gray-300">${escapeHTML(f.message)}</span>
      </li>
    `)
    .join('');

  els.resultSection.innerHTML = `
    <div class="bg-gray-900 border border-gray-700 overflow-hidden">

      <!-- Card header -->
      <div class="p-5 border-b border-gray-700">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-12 h-12 bg-black border border-gray-600 flex items-center justify-center text-xl font-bold text-gray-300 shrink-0">
              ${escapeHTML(initial)}
            </div>
            <div class="min-w-0">
              <h3 class="text-lg font-bold truncate">${escapeHTML(token.name)}</h3>
              <p class="text-xs text-gray-400">
                <span class="font-mono">${escapeHTML(shortAddress(address))}</span>
                <span class="mx-1">|</span>
                <span>${escapeHTML(chain.name)}</span>
              </p>
            </div>
          </div>
          <span class="shrink-0 px-2 py-1 text-xs font-bold border ${level.badge}">
            ${level.label}
          </span>
        </div>
      </div>

      <!-- Card body -->
      <div class="p-5 space-y-6">

        <!-- Risk score -->
        <div>
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-400">Risk score</span>
            <span class="font-mono font-bold">${risk.score} / 100</span>
          </div>
          <div class="h-2 bg-black border border-gray-700 overflow-hidden">
            <div class="risk-bar-fill h-full ${level.bar}" style="width: ${Math.max(risk.score, 3)}%"></div>
          </div>
        </div>

        <!-- Token details -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p class="text-gray-500 text-xs mb-1">Symbol</p>
            <p class="font-mono">${escapeHTML(token.symbol)}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs mb-1">Decimals</p>
            <p class="font-mono">${escapeHTML(token.decimals)}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs mb-1">Total supply</p>
            <p class="font-mono">${escapeHTML(token.totalSupply)}</p>
          </div>
        </div>

        <!-- What we found -->
        <div>
          <p class="text-sm font-semibold mb-2 text-white">What we found</p>
          <ul class="space-y-2">${factorItems}</ul>
        </div>

        <!-- Action -->
        <a
          href="${escapeHTML(dexUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-6 py-2 bg-purple-900 hover:bg-purple-800 text-white text-sm font-semibold rounded-sm border border-purple-700 transition"
        >
          Open in ${escapeHTML(chain.dexName)} &rarr;
        </a>
      </div>
    </div>
  `;

  els.resultSection.classList.remove('hidden');
  els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    els.historyList.innerHTML = `
      <p class="text-sm text-gray-500 text-center py-4">
        No checks yet. Paste an address above.
      </p>
    `;
    return;
  }

  const rows = items
    .map((item) => {
      const level = LEVEL_STYLES[item.riskLevel] || LEVEL_STYLES.unknown;
      return `
        <div class="flex items-center justify-between gap-3 p-2 bg-black hover:bg-gray-800 border border-gray-700 transition">
          <div class="flex items-center gap-3 min-w-0">
            <span class="shrink-0 px-2 py-0.5 text-[10px] font-bold border ${level.badge}">
              ${level.label}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate text-gray-200">
                ${escapeHTML(item.tokenName)} (${escapeHTML(item.tokenSymbol)})
              </p>
              <p class="text-xs text-gray-500 font-mono truncate">
                ${escapeHTML(shortAddress(item.contractAddress))} | ${escapeHTML(item.chainName)} | ${escapeHTML(formatDate(item.checkedAt))}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="history-delete text-sm shrink-0"
            data-delete-id="${escapeHTML(item.id)}"
            aria-label="Remove"
          >X</button>
        </div>
      `;
    })
    .join('');

  els.historyList.innerHTML = rows;
}

// HISTORY

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function saveToHistory(entry) {
  const items = loadHistory();
  items.unshift(entry);
  const trimmed = items.slice(0, HISTORY_LIMIT);
  persistHistory(trimmed);
  renderHistory(trimmed);
}

function clearHistory() {
  if (!confirm('Remove all saved checks?')) return;
  persistHistory([]);
  renderHistory([]);
}

function deleteHistoryItem(id) {
  const items = loadHistory().filter((item) => item.id !== id);
  persistHistory(items);
  renderHistory(items);
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// MAIN ACTION 

async function handleCheckToken() {
  hideError();

  const chainId = els.chainSelect.value;
  const rawAddress = els.addressInput.value;
  const validation = validateAddress(rawAddress);

  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  setLoading(true);

  try {
    const token = await fetchTokenData(chainId, validation.address);
    const risk  = analyzeRisk(token);

    renderResult({
      chainId,
      address: validation.address,
      token,
      risk,
    });

    saveToHistory({
      id:              makeId(),
      contractAddress: validation.address,
      chain:           chainId,
      chainName:       getChain(chainId).name,
      tokenName:       token.name,
      tokenSymbol:     token.symbol,
      riskLevel:       risk.level,
      riskScore:       risk.score,
      checkedAt:       new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    showError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

// INIT 

function populateChains() {
  els.chainSelect.innerHTML = CHAINS
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join('');
}

function bindEvents() {
  els.checkBtn.addEventListener('click', handleCheckToken);

  els.addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckToken();
    }
  });

  document.querySelectorAll('.demo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.addressInput.value = btn.dataset.address;
      els.addressInput.focus();
    });
  });

  els.clearHistory.addEventListener('click', clearHistory);

  els.historyList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-delete-id]');
    if (!target) return;
    deleteHistoryItem(target.dataset.deleteId);
  });
}

function init() {
  populateChains();
  bindEvents();
  renderHistory(loadHistory());

  if (els.footerYear) {
    els.footerYear.textContent = new Date().getFullYear();
  }
}

document.addEventListener('DOMContentLoaded', init);