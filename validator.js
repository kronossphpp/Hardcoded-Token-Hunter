// Token Validator - OFJAAAH Hardcoded Token Detector
// Valida tokens críticos para alertas de segurança em ambientes autorizados

const TOKEN_VALIDATORS = {

  // Firebase API Key Validation
  FIREBASE: async (token) => {
    try {
      // Tentar fazer uma requisição simples à API do Firebase
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true })
      });

      const data = await response.json();

      // Se retornar erro específico de API key inválida
      if (data.error && data.error.message === 'API key not valid') {
        return { valid: false, status: 'Token inválido ou expirado' };
      }

      // Se retornar qualquer outra resposta, a API key é válida
      if (response.status === 400 && data.error && data.error.message.includes('MISSING')) {
        return { valid: true, status: 'Token válido e ativo', severity: 'CRITICAL' };
      }

      return { valid: true, status: 'Token válido', severity: 'CRITICAL' };
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // GitHub Token Validation
  GITHUB: async (token) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Security-Monitor'
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        return {
          valid: true,
          status: `Token válido - Usuário: ${data.login}`,
          severity: 'CRITICAL',
          metadata: { username: data.login, email: data.email }
        };
      } else if (response.status === 401) {
        return { valid: false, status: 'Token inválido ou expirado' };
      } else {
        return { valid: null, status: `Status HTTP: ${response.status}` };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // GitLab Token Validation
  GITLAB: async (token) => {
    try {
      const response = await fetch('https://gitlab.com/api/v4/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        return {
          valid: true,
          status: `Token válido - Usuário: ${data.username}`,
          severity: 'CRITICAL',
          metadata: { username: data.username, email: data.email }
        };
      } else if (response.status === 401) {
        return { valid: false, status: 'Token inválido ou expirado' };
      } else {
        return { valid: null, status: `Status HTTP: ${response.status}` };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // Vercel Token Validation (Expandida para Bug Bounty)
  VERCEL: async (token) => {
    try {
      // Testar endpoint /v2/user
      const userResponse = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResponse.status === 200) {
        const userData = await userResponse.json();

        // Testar permissões adicionais
        const teamsResponse = await fetch('https://api.vercel.com/v2/teams', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const projectsResponse = await fetch('https://api.vercel.com/v9/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const teams = teamsResponse.ok ? await teamsResponse.json() : null;
        const projects = projectsResponse.ok ? await projectsResponse.json() : null;

        return {
          valid: true,
          status: `Token VERCEL válido - Usuário: ${userData.user.username || userData.user.email}`,
          severity: 'CRITICAL',
          metadata: {
            username: userData.user.username,
            email: userData.user.email,
            teams: teams?.teams?.length || 0,
            projects: projects?.projects?.length || 0,
            scope: 'Full API Access'
          }
        };
      } else if (userResponse.status === 403 || userResponse.status === 401) {
        return { valid: false, status: 'Token inválido ou expirado' };
      } else {
        return { valid: null, status: `Status HTTP: ${userResponse.status}` };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // Supabase Token Validation (Expandida - Bug Bounty)
  SUPABASE: async (token, projectUrl = null) => {
    try {
      // Supabase API keys são JWTs
      if (token.startsWith('eyJ') && token.includes('.')) {
        // Decodificar JWT
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);

          // Determinar tipo de key
          const role = payload.role || 'unknown';
          const isServiceRole = role === 'service_role';
          const isAnonKey = role === 'anon';

          // Verificar expiração
          if (payload.exp && payload.exp < now) {
            return { valid: false, status: 'JWT Supabase expirado' };
          }

          // Se temos URL do projeto, testar acesso real
          if (projectUrl || payload.iss) {
            const baseUrl = projectUrl || payload.iss;

            try {
              // Testar endpoint REST
              const testResponse = await fetch(`${baseUrl}/rest/v1/`, {
                headers: {
                  'apikey': token,
                  'Authorization': `Bearer ${token}`
                }
              });

              // Testar permissões de escrita (apenas para service_role)
              let writeAccess = false;
              if (isServiceRole) {
                try {
                  const writeTest = await fetch(`${baseUrl}/rest/v1/rpc/`, {
                    method: 'POST',
                    headers: {
                      'apikey': token,
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                  });
                  writeAccess = writeTest.status !== 401 && writeTest.status !== 403;
                } catch (e) {
                  // Ignorar erro
                }
              }

              return {
                valid: true,
                status: `SUPABASE ${role.toUpperCase()} Key válida - Projeto: ${baseUrl}`,
                severity: isServiceRole ? 'CRITICAL' : 'HIGH',
                metadata: {
                  role: role,
                  projectUrl: baseUrl,
                  expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'never',
                  writeAccess: isServiceRole ? writeAccess : 'N/A',
                  issuer: payload.iss
                }
              };

            } catch (fetchError) {
              // Key é válida mas não conseguimos testar acesso
              return {
                valid: true,
                status: `SUPABASE ${role.toUpperCase()} Key válida (formato JWT correto)`,
                severity: isServiceRole ? 'CRITICAL' : 'HIGH',
                metadata: {
                  role: role,
                  expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'never',
                  note: 'Não foi possível testar acesso real'
                }
              };
            }
          }

          // Sem URL, apenas validar JWT
          return {
            valid: true,
            status: `SUPABASE ${role.toUpperCase()} Key válida (JWT não expirado)`,
            severity: isServiceRole ? 'CRITICAL' : 'HIGH',
            metadata: {
              role: role,
              expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'never',
              note: 'URL do projeto não fornecida - validação parcial'
            }
          };

        } catch (decodeError) {
          return { valid: false, status: 'Formato de JWT Supabase inválido' };
        }
      }

      return { valid: null, status: 'Token não parece ser uma Supabase key válida' };
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // AWS Credentials Validation
  AWS: async (token) => {
    // AWS requer access key ID + secret, não podemos validar apenas com um
    return {
      valid: null,
      status: 'Validação AWS requer Access Key ID + Secret Access Key',
      severity: 'CRITICAL'
    };
  },

  // Slack Token Validation
  SLACK: async (token) => {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = await response.json();

      if (data.ok) {
        return {
          valid: true,
          status: `Token válido - Team: ${data.team}`,
          severity: 'HIGH',
          metadata: { user: data.user, team: data.team }
        };
      } else {
        return { valid: false, status: data.error || 'Token inválido' };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // Stripe Key Validation
  STRIPE: async (token) => {
    try {
      // Tentar listar customers (operação read-only)
      const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        return {
          valid: true,
          status: 'Token Stripe válido (acesso à conta)',
          severity: 'CRITICAL'
        };
      } else if (response.status === 401) {
        return { valid: false, status: 'Token inválido ou expirado' };
      } else {
        return { valid: null, status: `Status HTTP: ${response.status}` };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // Google API Key Validation
  GOOGLE: async (token) => {
    try {
      // Tentar uma API pública do Google
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${token}&maxResults=1`);

      const data = await response.json();

      if (response.status === 200) {
        return {
          valid: true,
          status: 'Google API Key válida',
          severity: 'HIGH'
        };
      } else if (data.error && data.error.message.includes('API key not valid')) {
        return { valid: false, status: 'API Key inválida' };
      } else if (data.error && data.error.message.includes('has not been used')) {
        return {
          valid: true,
          status: 'API Key válida (não foi usada ainda)',
          severity: 'HIGH'
        };
      } else {
        return { valid: null, status: data.error?.message || 'Erro ao validar' };
      }
    } catch (error) {
      return { valid: null, status: 'Erro ao validar: ' + error.message };
    }
  },

  // JWT Token Validation (genérico)
  JWT: async (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, status: 'Formato JWT inválido' };
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp) {
        if (payload.exp > now) {
          return {
            valid: true,
            status: 'JWT válido e não expirado',
            severity: 'MEDIUM',
            metadata: {
              expires: new Date(payload.exp * 1000).toISOString(),
              issuer: payload.iss,
              subject: payload.sub
            }
          };
        } else {
          return { valid: false, status: 'JWT expirado' };
        }
      } else {
        return {
          valid: null,
          status: 'JWT sem data de expiração (verificar manualmente)',
          severity: 'MEDIUM'
        };
      }
    } catch (error) {
      return { valid: false, status: 'Erro ao decodificar JWT: ' + error.message };
    }
  }
};

// Verificar se valor parece ser um falso positivo antes de validar
function isLikelyFalsePositive(value) {
  // Verificar se é apenas palavras comuns separadas por underscore
  if (/^[a-z]+(_[a-z]+){2,}$/.test(value)) {
    return true;
  }

  // Se não tem maiúsculas nem números, provavelmente é falso positivo
  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumbers = /[0-9]/.test(value);

  if (!hasUpperCase && !hasNumbers && value.length < 40) {
    return true;
  }

  return false;
}

// Função principal de validação
async function validateToken(type, value) {
  console.log(`🔍 Validando token do tipo: ${type}`);

  // Pre-validação: detectar falsos positivos antes de fazer requisições
  if (isLikelyFalsePositive(value)) {
    console.log(`⚠️ Token parece ser um falso positivo: ${value}`);
    return {
      valid: false,
      status: 'Provável falso positivo (nome de variável ou feature flag)',
      severity: 'LOW'
    };
  }

  // Mapear tipos para validadores
  const validatorMap = {
    'FIREBASE': 'FIREBASE',
    'GITHUB': 'GITHUB',
    'GITLAB': 'GITLAB',
    'VERCEL': 'VERCEL',
    'SUPABASE': 'SUPABASE',
    'AWS': 'AWS',
    'SLACK': 'SLACK',
    'STRIPE': 'STRIPE',
    'GOOGLE': 'GOOGLE',
    'JWT': 'JWT',
    'API_KEY': null, // Genérico, não validamos
    'TOKEN': null,
    'SECRET': null,
    'PASSWORD': null,
    'PRIVATE_KEY': null
  };

  const validatorType = validatorMap[type];

  if (!validatorType || !TOKEN_VALIDATORS[validatorType]) {
    return {
      valid: null,
      status: 'Validação não disponível para este tipo',
      severity: 'MEDIUM'
    };
  }

  try {
    const result = await TOKEN_VALIDATORS[validatorType](value);
    console.log(`✅ Resultado da validação:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Erro ao validar token:`, error);
    return {
      valid: null,
      status: 'Erro durante validação: ' + error.message
    };
  }
}

// Validar múltiplos tokens em lote
async function validateTokensBatch(tokens) {
  const results = [];

  for (const token of tokens) {
    const validation = await validateToken(token.type, token.value);
    results.push({
      ...token,
      validation
    });

    // Delay pequeno entre requisições para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Exportar para uso em outros scripts (ES6 module)
export { validateToken, validateTokensBatch };
