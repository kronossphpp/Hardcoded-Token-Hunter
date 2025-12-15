// Background Service Worker - OFJAAAH Hardcoded Token Detector
// Gerencia notificações, webhooks, e armazenamento

console.log('🔍 OFJAAAH Token Detector - Background Service Worker iniciado');

// Estado global do Deep Scan
let deepScanState = {
  isRunning: false,
  tabId: null,
  startTime: null,
  progress: {
    pagesVisited: 0,
    scriptsAnalyzed: 0,
    tokensFound: 0
  },
  results: null
};

// Inicializar configurações padrão
chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettings = {
    autoScanEnabled: false,
    notificationsEnabled: true,
    discordWebhookEnabled: false,
    discordWebhookUrl: '',
    saveHistory: true,
    scanDelay: 5000, // 5 segundos após carregar (aumentado para não travar o site)
    minTokenLength: 15,

    // Filtro de domínios
    skipSocialMediaScan: true, // Pular redes sociais por padrão

    // Proxy settings
    proxyEnabled: false,
    proxyHost: '127.0.0.1',
    proxyPort: 8080
  };

  // Verificar se já existe configuração
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: defaultSettings });
    console.log('⚙️ Configurações padrão criadas');
  }

  // Inicializar histórico se não existir
  const { history } = await chrome.storage.local.get('history');
  if (!history) {
    await chrome.storage.local.set({ history: [] });
    console.log('📚 Histórico inicializado');
  }
});

// Listener unificado para todas as mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Mensagens do content script
  if (request.action === 'tokensFound') {
    if (sender.tab) {
      handleTokensFound(request.data, sender.tab);
    } else {
      console.warn('⚠️ tokensFound recebido sem tab associado');
    }
    sendResponse({ status: 'received' });
  } else if (request.action === 'manualScan') {
    if (sender.tab) {
      handleManualScan(request.data, sender.tab);
    } else {
      console.warn('⚠️ manualScan recebido sem tab associado');
    }
    sendResponse({ status: 'received' });
  } else if (request.action === 'deepScanStarted') {
    // Deep scan iniciado
    deepScanState.isRunning = true;
    deepScanState.tabId = sender.tab?.id || null;
    deepScanState.startTime = Date.now();
    deepScanState.progress = request.progress || { pagesVisited: 0, scriptsAnalyzed: 0, tokensFound: 0 };
    console.log('🕷️ Deep Scan iniciado e registrado no background');
    sendResponse({ status: 'registered' });
  } else if (request.action === 'deepScanProgress') {
    // Atualizar progresso do deep scan
    if (deepScanState.isRunning) {
      deepScanState.progress = request.progress;
      console.log('📊 Progresso Deep Scan:', request.progress);
    }
    sendResponse({ status: 'updated' });
  } else if (request.action === 'deepScanCompleted') {
    // Deep scan completo
    deepScanState.isRunning = false;
    deepScanState.results = request.data;
    console.log('✅ Deep Scan completo e salvo no background');

    // Salvar no histórico
    if (sender.tab) {
      handleManualScan(request.data, sender.tab);
    }
    sendResponse({ status: 'completed' });
  } else if (request.action === 'getDeepScanState') {
    // Retornar estado atual do deep scan
    sendResponse({
      status: 'success',
      state: deepScanState
    });
  } else if (request.action === 'markTokenViewed') {
    // Marcar token como visualizado
    markTokenAsViewed(request.tokenId, request.tokenValue).then(result => {
      sendResponse(result);
    });
    return true;
  }
  // Ações de exportação e estatísticas
  else if (request.action === 'exportHistory') {
    exportHistory().then(sendResponse);
    return true;
  } else if (request.action === 'clearHistory') {
    clearHistory().then(sendResponse);
    return true;
  } else if (request.action === 'getStats') {
    getStats().then(sendResponse);
    return true;
  } else if (request.action === 'exportForPentest') {
    exportForPentest().then(sendResponse);
    return true;
  } else if (request.action === 'exportNucleiTemplate') {
    exportNucleiTemplate().then(sendResponse);
    return true;
  }
  return true;
});

// Processar tokens encontrados
async function handleTokensFound(foundTokens, tab) {
  if (!tab) {
    console.error('❌ handleTokensFound: tab é undefined');
    return;
  }

  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    console.error('❌ handleTokensFound: settings não encontradas');
    return;
  }

  // Validar estrutura de foundTokens
  if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
    console.error('❌ Estrutura de foundTokens inválida:', foundTokens);
    return;
  }

  if (foundTokens.tokens.length === 0) {
    console.log('✅ Nenhum token encontrado em:', tab.url);
    return;
  }

  console.log(`🔍 ${foundTokens.tokens.length} tokens encontrados em:`, tab.url);

  // Verificar se há tokens válidos
  const validTokens = foundTokens.tokens.filter(t => t.validation?.valid === true);
  const hasValidTokens = validTokens.length > 0;

  if (hasValidTokens) {
    console.log(`⚠️ ALERTA CRÍTICO: ${validTokens.length} token(s) válido(s) encontrado(s)!`);

    // Badge de alerta para tokens válidos
    chrome.action.setBadgeText({ text: '⚠️' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

    // Notificação crítica
    if (settings.notificationsEnabled) {
      await sendCriticalNotification(validTokens.length, foundTokens.tokens.length, tab);
    }
  } else {
    // Enviar notificação normal
    if (settings.notificationsEnabled) {
      await sendNotification(foundTokens.tokens.length, tab);
    }
  }

  // Salvar no histórico
  if (settings.saveHistory) {
    await saveToHistory(foundTokens, tab);
  }

  // Enviar para Discord
  if (settings.discordWebhookEnabled && settings.discordWebhookUrl) {
    await sendToDiscord(foundTokens, tab, settings.discordWebhookUrl);
  }
}

// Processar scan manual
async function handleManualScan(foundTokens, tab) {
  if (!tab) {
    console.error('❌ handleManualScan: tab é undefined');
    return;
  }

  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    console.error('❌ handleManualScan: settings não encontradas');
    return;
  }

  // Validar estrutura de foundTokens
  if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
    console.error('❌ Estrutura de foundTokens inválida:', foundTokens);
    return;
  }

  console.log(`📋 Scan manual: ${foundTokens.tokens.length} tokens em:`, tab.url);

  // Salvar no histórico
  if (settings.saveHistory) {
    await saveToHistory(foundTokens, tab);
  }

  // Enviar para Discord se configurado
  if (settings.discordWebhookEnabled && settings.discordWebhookUrl) {
    await sendToDiscord(foundTokens, tab, settings.discordWebhookUrl);
  }
}

// Salvar tokens no histórico
async function saveToHistory(foundTokens, tab) {
  if (!tab) {
    console.error('❌ saveToHistory: tab é undefined');
    return;
  }

  try {
    const { history = [] } = await chrome.storage.local.get('history');

    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      url: tab.url || 'URL desconhecida',
      title: tab.title || 'Título desconhecido',
      favicon: tab.favIconUrl || '',
      tokensCount: foundTokens.tokens?.length || 0,
      tokens: foundTokens.tokens || [],
      scriptsAnalyzed: foundTokens.scriptsAnalyzed || 0
    };

    // Adicionar no início do array (mais recente primeiro)
    history.unshift(entry);

    // Limitar histórico a 500 entradas
    const limitedHistory = history.slice(0, 500);

    await chrome.storage.local.set({ history: limitedHistory });
    console.log('💾 Tokens salvos no histórico');
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}

// Enviar notificação
async function sendNotification(tokenCount, tab) {
  if (!tab) {
    console.error('❌ sendNotification: tab é undefined');
    return;
  }

  try {
    const notificationId = `tokens-${Date.now()}`;
    const tabInfo = tab.title || tab.url || 'Site desconhecido';

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🔍 Tokens Hardcoded Detectados!',
      message: `Encontrados ${tokenCount} token(s) em:\n${truncateText(tabInfo, 60)}`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: '👁️ Ver Detalhes' },
        { title: '📋 Ver Histórico' }
      ]
    });

    console.log('🔔 Notificação enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
  }
}

// Enviar notificação crítica para tokens válidos
async function sendCriticalNotification(validCount, totalCount, tab) {
  if (!tab) {
    console.error('❌ sendCriticalNotification: tab é undefined');
    return;
  }

  try {
    const notificationId = `critical-${Date.now()}`;
    const tabInfo = tab.title || tab.url || 'Site desconhecido';

    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🚨 ALERTA CRÍTICO: Tokens Válidos Detectados!',
      message: `⚠️ ${validCount} token(s) VÁLIDO(S) de ${totalCount} encontrados em:\n${truncateText(tabInfo, 50)}\n\nAÇÃO NECESSÁRIA IMEDIATA!`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: '🚨 Ver Agora' },
        { title: '📋 Ver Histórico' }
      ]
    });

    console.log('🚨 Notificação crítica enviada');
  } catch (error) {
    console.error('❌ Erro ao enviar notificação crítica:', error);
  }
}

// Listener para cliques nas notificações
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Ver Detalhes - abrir popup
    const windows = await chrome.windows.getAll();
    if (windows.length > 0) {
      chrome.action.openPopup();
    }
  } else if (buttonIndex === 1) {
    // Ver Histórico - abrir página de histórico
    chrome.tabs.create({ url: 'history.html' });
  }
  chrome.notifications.clear(notificationId);
});

// Enviar para Discord Webhook
async function sendToDiscord(foundTokens, tab, webhookUrl) {
  if (!tab) {
    console.error('❌ sendToDiscord: tab é undefined');
    return;
  }

  try {
    // Validar estrutura de foundTokens
    if (!foundTokens || !foundTokens.tokens || !Array.isArray(foundTokens.tokens)) {
      console.error('❌ sendToDiscord: Estrutura de foundTokens inválida:', foundTokens);
      return;
    }

    const tabUrl = tab.url || 'URL desconhecida';
    const tabTitle = tab.title || 'Sem título';

    // Contar tokens validados
    const validTokens = foundTokens.tokens.filter(t => t.validation?.valid === true);
    const invalidTokens = foundTokens.tokens.filter(t => t.validation?.valid === false);
    const unvalidatedTokens = foundTokens.tokens.filter(t => t.validation?.valid === null || t.validation?.valid === undefined);

    // Definir cor do embed baseado na severidade
    let embedColor = 0xF5576C; // Rosa padrão
    if (validTokens.length > 0) {
      embedColor = 0xFF0000; // Vermelho para tokens válidos
    }

    const embed = {
      title: validTokens.length > 0 ? '🚨 ALERTA CRÍTICO: Tokens Válidos Detectados!' : '🔍 Tokens Hardcoded Detectados by OFJAAAH',
      description: `**${foundTokens.tokens.length}** token(s) encontrado(s)${validTokens.length > 0 ? `\n\n⚠️ **${validTokens.length} TOKEN(S) VÁLIDO(S) E ATIVO(S)!**` : ''}`,
      color: embedColor,
      url: tabUrl,
      fields: [
        {
          name: '🌐 Site',
          value: truncateText(tabTitle, 256),
          inline: false
        },
        {
          name: '🔗 URL',
          value: truncateText(tabUrl, 256),
          inline: false
        },
        {
          name: '📄 Scripts Analisados',
          value: (foundTokens.scriptsAnalyzed || 0).toString(),
          inline: true
        },
        {
          name: '🔑 Tokens Encontrados',
          value: foundTokens.tokens.length.toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'OFJAAAH Hardcoded Token Detector',
        icon_url: 'https://ofjaaah.com/favicon.ico'
      }
    };

    // Adicionar resumo de validação se houver tokens validados
    if (validTokens.length > 0 || invalidTokens.length > 0 || unvalidatedTokens.length > 0) {
      embed.fields.push({
        name: '🔐 Status de Validação',
        value: `✅ Válidos: **${validTokens.length}**\n❌ Inválidos: **${invalidTokens.length}**\n⚠️ Não validados: **${unvalidatedTokens.length}**`,
        inline: false
      });
    }

    // Adicionar tokens ao embed (máximo 10 para não exceder limite)
    const tokensToShow = foundTokens.tokens.slice(0, 10);
    tokensToShow.forEach((token, index) => {
      const tokenValue = truncateText(token.value, 100);
      const scriptUrl = truncateText(token.scriptUrl, 200);

      // Determinar status de validação
      let validationIcon = '⚠️';
      let validationStatus = 'Não validado';

      if (token.validation) {
        if (token.validation.valid === true) {
          validationIcon = '✅';
          validationStatus = `**VÁLIDO**: ${token.validation.status}`;
          if (token.validation.severity) {
            validationStatus += ` (${token.validation.severity})`;
          }
        } else if (token.validation.valid === false) {
          validationIcon = '❌';
          validationStatus = `Inválido: ${token.validation.status}`;
        } else {
          validationIcon = '⚠️';
          validationStatus = token.validation.status || 'Não foi possível validar';
        }
      }

      embed.fields.push({
        name: `${getTypeEmoji(token.type)} ${validationIcon} Token ${index + 1}: ${token.type}`,
        value: `\`\`\`\n${tokenValue}\n\`\`\`\n📄 Script: ${scriptUrl}\n🔐 **Status:** ${validationStatus}`,
        inline: false
      });
    });

    // Se houver mais tokens, adicionar nota
    if (foundTokens.tokens.length > 10) {
      embed.fields.push({
        name: '⚠️ Aviso',
        value: `Mais ${foundTokens.tokens.length - 10} token(s) encontrado(s). Veja o histórico completo na extensão.`,
        inline: false
      });
    }

    const payload = {
      username: 'OFJAAAH Token Detector',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Tokens enviados para Discord');
    } else {
      console.error('❌ Erro ao enviar para Discord:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar para Discord:', error);
  }
}

// Funções auxiliares
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getTypeEmoji(type) {
  const emojis = {
    'API_KEY': '🔑',
    'JWT': '🎫',
    'AWS': '☁️',
    'GITHUB': '🐙',
    'GITLAB': '🦊',
    'VERCEL': '▲',
    'SUPABASE': '⚡',
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

// Inicializar estado da extensão (Badge e Proxy) após settings estarem prontas
async function initializeExtensionState() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    if (!settings) {
      console.log('⚠️ Settings ainda não inicializadas, aguardando...');
      return;
    }

    // Configurar badge baseado no autoScan
    if (settings.autoScanEnabled) {
      chrome.action.setBadgeText({ text: 'AUTO' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    }

    // Configurar proxy se habilitado
    if (settings.proxyEnabled) {
      await configureProxy(settings);
    }

    console.log('✅ Estado da extensão inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar estado da extensão:', error);
  }
}

// Chamar inicialização com delay para garantir que onInstalled termine
setTimeout(initializeExtensionState, 100);

// Listener para mudanças nas configurações
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings && changes.settings.newValue) {
    const newSettings = changes.settings.newValue;
    if (newSettings.autoScanEnabled) {
      chrome.action.setBadgeText({ text: 'AUTO' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    // Atualizar configuração de proxy
    const oldSettings = changes.settings.oldValue || {};
    if (newSettings.proxyEnabled !== oldSettings.proxyEnabled ||
        newSettings.proxyHost !== oldSettings.proxyHost ||
        newSettings.proxyPort !== oldSettings.proxyPort) {
      configureProxy(newSettings);
    }
  }
});

// Configurar proxy
async function configureProxy(settings) {
  try {
    if (!settings) {
      console.error('❌ configureProxy: settings é undefined');
      return;
    }

    if (settings.proxyEnabled && settings.proxyHost && settings.proxyPort) {
      const proxyConfig = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "http",
            host: settings.proxyHost,
            port: parseInt(settings.proxyPort, 10)
          },
          bypassList: []
        }
      };

      await chrome.proxy.settings.set({
        value: proxyConfig,
        scope: 'regular'
      });

      console.log(`✅ Proxy configurado: ${settings.proxyHost}:${settings.proxyPort}`);

      // Atualizar badge para indicar proxy ativo
      chrome.action.setBadgeText({ text: 'PROXY' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF6B35' });
    } else {
      // Desabilitar proxy
      await chrome.proxy.settings.clear({
        scope: 'regular'
      });

      console.log('✅ Proxy desabilitado');

      // Restaurar badge anterior
      if (settings && settings.autoScanEnabled) {
        chrome.action.setBadgeText({ text: 'AUTO' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao configurar proxy:', error);
  }
}

// Removido: inicialização movida para initializeExtensionState()
// Removido: listener duplicado mesclado com o principal

// Exportar histórico
async function exportHistory() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    return {
      success: true,
      data: history,
      count: history.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Limpar histórico
async function clearHistory() {
  try {
    await chrome.storage.local.set({ history: [] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obter estatísticas
async function getStats() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    // Filtrar URLs válidas para uniqueSites
    const validUrls = history
      .map(e => {
        try {
          return new URL(e.url).hostname;
        } catch {
          return null;
        }
      })
      .filter(hostname => hostname !== null);

    const stats = {
      totalScans: history.length,
      totalTokens: history.reduce((sum, entry) => sum + entry.tokensCount, 0),
      uniqueSites: [...new Set(validUrls)].length,
      lastScan: history[0] ? history[0].timestamp : null
    };

    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Marcar token como visualizado no histórico
async function markTokenAsViewed(tokenId, tokenValue) {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    let found = false;

    // Procurar e atualizar o token em todas as entradas do histórico
    for (const entry of history) {
      for (const token of entry.tokens) {
        if ((token.id && token.id === tokenId) || token.value === tokenValue) {
          token.viewed = true;
          token.viewedAt = new Date().toISOString();
          found = true;
        }
      }
    }

    if (found) {
      await chrome.storage.local.set({ history });
      console.log('💾 Token marcado como visualizado no histórico');
      return { success: true, message: 'Token marcado como visualizado' };
    } else {
      console.warn('⚠️ Token não encontrado no histórico');
      return { success: false, message: 'Token não encontrado' };
    }
  } catch (error) {
    console.error('❌ Erro ao marcar token como visualizado:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// EXPORTAÇÃO PARA FERRAMENTAS DE PENTEST
// ========================================

// Exportar em formato otimizado para pentest (JSON estruturado)
async function exportForPentest() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    // Agrupar tokens por tipo e severidade
    const tokensBySeverity = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    const endpoints = [];
    const domains = new Set();

    for (const entry of history) {
      domains.add(new URL(entry.url).hostname);

      for (const token of entry.tokens) {
        const severity = token.severity || 'MEDIUM';

        tokensBySeverity[severity].push({
          type: token.type,
          value: token.value,
          url: entry.url,
          scriptUrl: token.scriptUrl,
          timestamp: token.timestamp,
          validation: token.validation
        });
      }

      // Coletar endpoints
      if (entry.endpoints) {
        endpoints.push(...entry.endpoints);
      }
    }

    const pentestData = {
      generated: new Date().toISOString(),
      tool: 'OFJAAAH Hardcoded Token Detector',
      summary: {
        total_tokens: history.reduce((sum, e) => sum + e.tokensCount, 0),
        critical: tokensBySeverity.CRITICAL.length,
        high: tokensBySeverity.HIGH.length,
        medium: tokensBySeverity.MEDIUM.length,
        low: tokensBySeverity.LOW.length,
        domains_scanned: domains.size,
        endpoints_found: endpoints.length
      },
      tokens_by_severity: tokensBySeverity,
      endpoints,
      domains: Array.from(domains)
    };

    return {
      success: true,
      data: pentestData,
      filename: `pentest-tokens-${Date.now()}.json`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Exportar template Nuclei para endpoints encontrados
async function exportNucleiTemplate() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');

    const endpoints = [];
    for (const entry of history) {
      if (entry.endpoints) {
        endpoints.push(...entry.endpoints.map(e => e.url));
      }
    }

    const uniqueEndpoints = [...new Set(endpoints)];

    const nucleiTemplate = {
      id: 'hardcoded-tokens-scan',
      info: {
        name: 'Hardcoded Tokens and Endpoints Scanner',
        author: 'OFJAAAH',
        severity: 'high',
        description: 'Scans for hardcoded tokens and sensitive endpoints discovered by OFJAAAH Token Detector',
        tags: ['tokens', 'secrets', 'hardcoded']
      },
      requests: [
        {
          method: 'GET',
          path: uniqueEndpoints.slice(0, 50), // Limitar a 50 endpoints
          matchers: [
            {
              type: 'status',
              status: [200]
            }
          ]
        }
      ]
    };

    return {
      success: true,
      data: nucleiTemplate,
      filename: `nuclei-template-${Date.now()}.yaml`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
