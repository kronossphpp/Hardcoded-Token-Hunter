// History.js - Gerenciamento de Histórico

let historyData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  loadStats();

  // Search functionality
  document.getElementById('searchInput').addEventListener('input', filterHistory);

  // Export and clear buttons
  document.getElementById('exportJsonBtn').addEventListener('click', exportHistory);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
});

// Carregar histórico
async function loadHistory() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    historyData = history;

    const historyList = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyState');

    if (history.length === 0) {
      historyList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    historyList.style.display = 'flex';
    emptyState.style.display = 'none';

    renderHistory(history);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
  }
}

// Renderizar histórico
function renderHistory(history) {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';

  history.forEach(entry => {
    const item = createHistoryItem(entry);
    historyList.appendChild(item);
  });
}

// Criar item de histórico
function createHistoryItem(entry) {
  const div = document.createElement('div');
  div.className = 'history-item';

  const date = new Date(entry.timestamp);
  const formattedDate = date.toLocaleString('pt-BR');

  // Contar tokens por tipo
  const tokensByType = {};
  entry.tokens.forEach(token => {
    tokensByType[token.type] = (tokensByType[token.type] || 0) + 1;
  });

  const tokenBadges = Object.entries(tokensByType)
    .map(([type, count]) => `<span class="token-badge">${getTypeEmoji(type)} ${type}: ${count}</span>`)
    .join('');

  div.innerHTML = `
    <div class="history-header">
      <img class="favicon" src="${entry.favicon || 'icons/icon48.png'}">
      <div class="history-info">
        <div class="history-title">${escapeHtml(entry.title || 'Sem título')}</div>
        <a class="history-url" href="${entry.url}" target="_blank">${truncateUrl(entry.url, 80)}</a>
      </div>
      <div class="history-timestamp">${formattedDate}</div>
    </div>

    <div class="history-meta">
      <span>📄 ${entry.scriptsAnalyzed} scripts analisados</span>
      <span>🔑 ${entry.tokensCount} tokens encontrados</span>
    </div>

    <div class="tokens-summary">
      ${tokenBadges}
    </div>

    <button class="toggle-tokens" data-entry-id="${entry.id}">
      👁️ Ver Tokens
    </button>

    <div class="tokens-list" id="tokens-${entry.id}">
      ${entry.tokens.map((token, index) => `
        <div class="result-item">
          <div class="result-header">
            <span class="result-icon">${getTypeEmoji(token.type)}</span>
            <span class="result-title">${getTypeLabel(token.type)}</span>
            <span class="result-type">${token.type}</span>
            ${token.viewed ? '<span class="viewed-badge">🔥 Visualizado</span>' : ''}
          </div>
          ${token.validation && token.validation.valid === true ? `
            <div class="validation-warning">
              🚨 ALERTA: Token VÁLIDO e ATIVO!<br>
              <strong>Status:</strong> ${escapeHtml(token.validation.status || 'Válido')}
            </div>
          ` : ''}
          <div class="result-script">
            📄 Script: <a href="${token.scriptUrl}" target="_blank">${truncateUrl(token.scriptUrl, 60)}</a>
          </div>
          <div class="result-token">
            <strong>Token:</strong><br>
            ${escapeHtml(token.value)}
          </div>
          ${token.context ? `
            <div class="result-token" style="margin-top: 5px; border-left-color: #667eea;">
              <strong>Contexto:</strong><br>
              ${escapeHtml(token.context)}
            </div>
          ` : ''}
          ${token.viewed && token.viewedAt ? `
            <div style="margin-top: 8px; font-size: 10px; color: #666; font-style: italic;">
              🔥 Visualizado em: ${new Date(token.viewedAt).toLocaleString('pt-BR')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // Adicionar event listener ao botão toggle
  const toggleButton = div.querySelector('.toggle-tokens');
  toggleButton.addEventListener('click', function() {
    toggleTokens(entry.id, this);
  });

  return div;
}

// Toggle tokens visibility
function toggleTokens(entryId, button) {
  const tokensList = document.getElementById(`tokens-${entryId}`);
  tokensList.classList.toggle('expanded');

  if (tokensList.classList.contains('expanded')) {
    button.textContent = '🔼 Ocultar Tokens';
  } else {
    button.textContent = '👁️ Ver Tokens';
  }
}

// Carregar estatísticas
async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });

    if (response.success) {
      const stats = response.stats;

      document.getElementById('totalScans').textContent = stats.totalScans;
      document.getElementById('totalTokens').textContent = stats.totalTokens;
      document.getElementById('uniqueSites').textContent = stats.uniqueSites;

      if (stats.lastScan) {
        const date = new Date(stats.lastScan);
        document.getElementById('lastScan').textContent = date.toLocaleDateString('pt-BR');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Filtrar histórico
function filterHistory() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  if (!searchTerm) {
    renderHistory(historyData);
    return;
  }

  const filtered = historyData.filter(entry => {
    return (
      entry.url.toLowerCase().includes(searchTerm) ||
      entry.title.toLowerCase().includes(searchTerm) ||
      entry.tokens.some(token =>
        token.type.toLowerCase().includes(searchTerm) ||
        token.value.toLowerCase().includes(searchTerm)
      )
    );
  });

  renderHistory(filtered);
}

// Exportar histórico como JSON
async function exportHistory() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportHistory' });

    if (response.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `hardcoded-tokens-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Histórico exportado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao exportar:', error);
    alert('❌ Erro ao exportar histórico: ' + error.message);
  }
}

// Exportar histórico como CSV
async function exportCSV() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportHistory' });

    if (response.success) {
      const history = response.data;

      // Criar CSV
      let csv = 'Timestamp,URL,Title,Token Type,Token Value,Script URL\n';

      history.forEach(entry => {
        entry.tokens.forEach(token => {
          csv += `"${entry.timestamp}","${entry.url}","${entry.title}","${token.type}","${token.value}","${token.scriptUrl}"\n`;
        });
      });

      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `hardcoded-tokens-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Histórico exportado como CSV com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    alert('❌ Erro ao exportar CSV: ' + error.message);
  }
}

// Limpar histórico
async function clearHistory() {
  if (!confirm('🗑️ Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearHistory' });

    if (response.success) {
      historyData = [];
      document.getElementById('historyList').style.display = 'none';
      document.getElementById('emptyState').style.display = 'block';

      // Reset stats
      document.getElementById('totalScans').textContent = '0';
      document.getElementById('totalTokens').textContent = '0';
      document.getElementById('uniqueSites').textContent = '0';
      document.getElementById('lastScan').textContent = '-';

      alert('✅ Histórico limpo com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    alert('❌ Erro ao limpar histórico: ' + error.message);
  }
}

// Funções auxiliares
function getTypeEmoji(type) {
  const emojis = {
    'API_KEY': '🔑',
    'JWT': '🎫',
    'AWS': '☁️',
    'GITHUB': '🐙',
    'SLACK': '💬',
    'STRIPE': '💳',
    'FIREBASE': '🔥',
    'GOOGLE': '🔍',
    'FACEBOOK': '👤',
    'TWITTER': '🐦',
    'PASSWORD': '🔐',
    'SECRET': '🤫',
    'TOKEN': '🎟️',
    'PRIVATE_KEY': '🔒'
  };
  return emojis[type] || '⚠️';
}

function getTypeLabel(type) {
  const labels = {
    'API_KEY': 'API Key',
    'JWT': 'JWT Token',
    'AWS': 'AWS Credentials',
    'GITHUB': 'GitHub Token',
    'SLACK': 'Slack Token',
    'STRIPE': 'Stripe Key',
    'FIREBASE': 'Firebase Config',
    'GOOGLE': 'Google API Key',
    'FACEBOOK': 'Facebook Token',
    'TWITTER': 'Twitter Token',
    'PASSWORD': 'Password',
    'SECRET': 'Secret Key',
    'TOKEN': 'Token',
    'PRIVATE_KEY': 'Private Key'
  };
  return labels[type] || 'Credencial';
}

function truncateUrl(url, maxLength) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
