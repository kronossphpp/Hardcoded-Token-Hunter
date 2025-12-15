// Settings.js - Gerenciamento de Configurações

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Event listeners
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  document.getElementById('testWebhookBtn').addEventListener('click', testWebhook);
});

// Carregar configurações salvas
async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    if (settings) {
      document.getElementById('autoScanEnabled').checked = settings.autoScanEnabled || false;
      document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
      document.getElementById('discordWebhookEnabled').checked = settings.discordWebhookEnabled || false;
      document.getElementById('discordWebhookUrl').value = settings.discordWebhookUrl || '';
      document.getElementById('saveHistory').checked = settings.saveHistory !== false;
      document.getElementById('scanDelay').value = settings.scanDelay || 3000;
      document.getElementById('minTokenLength').value = settings.minTokenLength || 15;

      // Filtro de redes sociais (ativo por padrão)
      document.getElementById('skipSocialMediaScan').checked = settings.skipSocialMediaScan !== false;

      // Proxy settings
      document.getElementById('proxyEnabled').checked = settings.proxyEnabled || false;
      document.getElementById('proxyHost').value = settings.proxyHost || '127.0.0.1';
      document.getElementById('proxyPort').value = settings.proxyPort || '8080';
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
}

// Salvar configurações
async function saveSettings() {
  try {
    const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
    const webhookEnabled = document.getElementById('discordWebhookEnabled').checked;

    // Validar webhook URL se estiver ativa
    if (webhookEnabled && webhookUrl) {
      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
          !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        alert('⚠️ URL do webhook inválida!\n\nDeve começar com:\nhttps://discord.com/api/webhooks/\nou\nhttps://discordapp.com/api/webhooks/');
        return;
      }

      // Validar formato básico
      const webhookParts = webhookUrl.split('/');
      if (webhookParts.length < 7) {
        alert('⚠️ URL do webhook incompleta!\n\nFormato esperado:\nhttps://discord.com/api/webhooks/[ID]/[TOKEN]');
        return;
      }
    }

    const settings = {
      autoScanEnabled: document.getElementById('autoScanEnabled').checked,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      discordWebhookEnabled: webhookEnabled,
      discordWebhookUrl: webhookUrl,
      saveHistory: document.getElementById('saveHistory').checked,
      scanDelay: parseInt(document.getElementById('scanDelay').value) || 3000,
      minTokenLength: parseInt(document.getElementById('minTokenLength').value) || 15,

      // Filtro de redes sociais
      skipSocialMediaScan: document.getElementById('skipSocialMediaScan').checked,

      // Proxy settings
      proxyEnabled: document.getElementById('proxyEnabled').checked,
      proxyHost: document.getElementById('proxyHost').value.trim() || '127.0.0.1',
      proxyPort: parseInt(document.getElementById('proxyPort').value) || 8080
    };

    await chrome.storage.local.set({ settings });

    // Mostrar mensagem de sucesso
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);

    console.log('✅ Configurações salvas:', settings);
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    alert('Erro ao salvar configurações: ' + error.message);
  }
}

// Restaurar configurações padrão
async function resetSettings() {
  if (!confirm('🔄 Tem certeza que deseja restaurar as configurações padrão?')) {
    return;
  }

  const defaultSettings = {
    autoScanEnabled: false,
    notificationsEnabled: true,
    discordWebhookEnabled: false,
    discordWebhookUrl: '',
    saveHistory: true,
    scanDelay: 3000,
    minTokenLength: 15,

    // Filtro de redes sociais
    skipSocialMediaScan: true,

    // Proxy settings
    proxyEnabled: false,
    proxyHost: '127.0.0.1',
    proxyPort: 8080
  };

  try {
    await chrome.storage.local.set({ settings: defaultSettings });
    await loadSettings();

    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = '✅ Configurações restauradas para o padrão!';
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
      successMessage.textContent = '✅ Configurações salvas com sucesso!';
    }, 3000);

    console.log('✅ Configurações restauradas para o padrão');
  } catch (error) {
    console.error('❌ Erro ao restaurar configurações:', error);
    alert('Erro ao restaurar configurações: ' + error.message);
  }
}

// Testar webhook do Discord
async function testWebhook() {
  const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
  const statusDiv = document.getElementById('webhookStatus');

  if (!webhookUrl) {
    statusDiv.textContent = '⚠️ Por favor, insira uma URL de webhook';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
    return;
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    statusDiv.textContent = '❌ URL inválida! Deve começar com https://discord.com/api/webhooks/ ou https://discordapp.com/api/webhooks/';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
    return;
  }

  // Mostrar loading
  statusDiv.textContent = '⏳ Testando webhook...';
  statusDiv.className = 'webhook-status';
  statusDiv.style.background = '#e3f2fd';
  statusDiv.style.color = '#1976d2';
  statusDiv.style.border = '1px solid #2196f3';
  statusDiv.style.display = 'block';

  try {
    const testPayload = {
      username: 'OFJAAAH Token Detector',
      embeds: [{
        title: '🧪 Teste de Webhook',
        description: 'Esta é uma mensagem de teste do **Hardcoded Token Detector**!',
        color: 0x667EEA,
        fields: [
          {
            name: '✅ Status',
            value: 'Webhook configurado corretamente!',
            inline: true
          },
          {
            name: '🔧 Modo',
            value: 'Teste',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'by OFJAAAH - https://ofjaaah.com'
        }
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      statusDiv.textContent = '✅ Webhook testado com sucesso! Verifique o canal do Discord.';
      statusDiv.className = 'webhook-status success';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    } else {
      const errorText = await response.text();
      statusDiv.textContent = `❌ Erro ${response.status}: ${errorText || response.statusText}`;
      statusDiv.className = 'webhook-status error';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  } catch (error) {
    statusDiv.textContent = `❌ Erro ao testar webhook: ${error.message}`;
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}
