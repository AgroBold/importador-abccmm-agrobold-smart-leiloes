/**
 * Background Script - Importador AgroBold
 * Gerencia as comunicações entre o popup, content scripts e storage
 */

// Service workers não suportam Axios nativamente, usar fetch
// Criar uma função auxiliar para simular axios com melhor tratamento de erro

// Função auxiliar para simular axios com fetch
async function axiosLike(config) {
  const { method = 'GET', url, headers = {}, data, timeout = 10000 } = config;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const fetchOptions = {
      method,
      headers,
      signal: controller.signal
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    const responseData = await response.json();
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      };
      throw error;
    }
    
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText
    };
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      throw timeoutError;
    }
    
    if (!err.response) {
      err.request = true; // Indica erro de rede
    }
    
    throw err;
  }
}

// Configuração da API - URL Base
// Para desenvolvimento: 'http://localhost:8080/api_importador'
// Para produção: 'https://sistema.agrobold.com.br/api_importador'
const API_BASE_URL = 'https://sistema.agrobold.com.br/api_importador/importador_abccmm';
//const API_BASE_URL = 'http://localhost:80/api_importador/importador_abccmm'; // Para desenvolvimento com ngrok

// Teste de conectividade inicial
async function testarConectividadeInicial() {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'AgroBold-Extension/1.0'
      }
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

// Verificar se há token salvo ao inicializar
async function verificarTokenSalvo() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token', 'userEmail', 'harasInfo'], function(result) {
      if (result.token && result.userEmail) {
        // Token encontrado, usuário já está logado
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        resolve({ 
          logado: true, 
          token: result.token, 
          email: result.userEmail,
          haras: result.harasInfo 
        });
      } else {
        // Sem token, usuário precisa fazer login
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
        resolve({ logado: false });
      }
    });
  });
}

// Executar teste inicial e verificação de token
testarConectividadeInicial();
verificarTokenSalvo();

// Listener para mensagens dos content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "verificarLogin") {
    // Verificar se o usuário já está logado
    chrome.storage.local.get(['token', 'userEmail', 'harasInfo'], function(result) {
      if (result.token && result.userEmail) {
        sendResponse({
          success: true,
          logado: true,
          token: result.token,
          email: result.userEmail,
          haras: result.harasInfo,
          message: 'Usuário já está logado'
        });
      } else {
        sendResponse({
          success: true,
          logado: false,
          message: 'Usuário não está logado'
        });
      }
    });
    return true;
  }

  if (message.action === "testarAPI") {
    // Função para testar conectividade com a API
    const rota = `${API_BASE_URL}/login.php`;
    
    // Testar com GET simples (método correto da API)
    fetch(rota, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'AgroBold-Extension/1.0'
      }
    })
    .then(res => {
      sendResponse({ 
        success: true, 
        status: res.status,
        message: `API endpoint acessível (Status: ${res.status})` 
      });
    })
    .catch(err => {
      sendResponse({ 
        success: false, 
        message: 'API inacessível: ' + err.message 
      });
    });
    
    return true;
  }

  if (message.action === "realizarLogin") {
    // Realizar login através do background script usando a API única
    const { email, senha } = message;
    
    // Usar GET com parâmetros na URL como no Postman
    const params = new URLSearchParams({
      email: email.trim(),
      senha: senha.trim()
    });
    
    const rota = `${API_BASE_URL}/login.php?${params.toString()}`;
    
    // Configurar requisição para login
    const config = {
      method: 'GET',
      url: rota,
      headers: { 
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'AgroBold-Extension/1.0'
      },
      timeout: 10000 // 10 segundos de timeout
    };
    
    // Usar nossa função axiosLike que funciona em service workers
    axiosLike(config)
    .then(response => {
      // Os dados já vêm parseados em response.data
      const data = response.data;
      console.log('Resposta completa da API de login:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.access_token) {
        // Salvar o token de forma persistente
        const harasInfo = {
          id: data.data.id_haras,
          nome: data.data.nome_haras,
          email: data.data.email_haras,
          cpfCnpj: data.data.cpf_cnpj_haras || data.data.cpf_haras || data.data.cnpj_haras || data.data.documento_haras || 'Não informado'
        };
        
        console.log('Salvando harasInfo no storage:', harasInfo);
        
        chrome.storage.local.set({ 
          token: data.data.access_token,
          userEmail: email,
          loginTimestamp: Date.now(),
          harasInfo: harasInfo
        }, function () {
          // Atualizar badge para mostrar que está logado
          chrome.action.setBadgeText({ text: "✓" });
          chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
          
          // Forçar detecção de dados após login e mostrar modal
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
              console.log('Iniciando processo de detecção pós-login...');
              
              // Primeiro, forçar re-detecção dos dados na página atual
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "forcarDeteccao"
              }).then((response) => {
                console.log('Resposta da forcarDeteccao:', response);
                
                // Aguardar um pouco mais para dar tempo da detecção processar
                setTimeout(() => {
                  // Verificar se há dados detectados
                  chrome.storage.local.get(['dadosDetectados'], function(result) {
                    console.log('Dados no storage após detecção:', result.dadosDetectados);
                    
                    if (result.dadosDetectados && 
                        ((result.dadosDetectados.Nome && result.dadosDetectados.Nome.trim() !== '') || 
                         (result.dadosDetectados.Registro && result.dadosDetectados.Registro.trim() !== ''))) {
                      // Há dados detectados, mostrar modal completo
                      console.log('Mostrando modal com dados detectados');
                      chrome.tabs.sendMessage(tabs[0].id, {
                        action: "mostrarModalLateral",
                        dados: result.dadosDetectados,
                        userInfo: {
                          nome: data.data.nome_haras,
                          email: data.data.email_haras,
                          cpfCnpj: data.data.cpf_cnpj_haras || data.data.cpf_haras || data.data.cnpj_haras || data.data.documento_haras || 'Não informado'
                        }
                      }).catch(err => {
                        console.log('Erro ao mostrar modal com dados:', err);
                      });
                    } else {
                      // Sem dados, mostrar modal minimizado apenas com info do usuário
                      console.log('Mostrando modal sem dados detectados');
                      chrome.tabs.sendMessage(tabs[0].id, {
                        action: "mostrarModalSemDados",
                        userInfo: {
                          nome: data.data.nome_haras,
                          email: data.data.email_haras,
                          cpfCnpj: data.data.cpf_cnpj_haras || data.data.cpf_haras || data.data.cnpj_haras || data.data.documento_haras || 'Não informado'
                        }
                      }).catch(err => {
                        console.log('Erro ao mostrar modal sem dados:', err);
                      });
                    }
                  });
                }, 1500); // Aumentando para 1.5 segundos
              }).catch(err => {
                console.log('Erro ao forçar detecção:', err);
                // Se não conseguir forçar detecção, mostrar modal sem dados
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: "mostrarModalSemDados",
                  userInfo: {
                    nome: data.data.nome_haras,
                    email: data.data.email_haras,
                    cpfCnpj: data.data.cpf_cnpj_haras || data.data.cpf_haras || data.data.cnpj_haras || data.data.documento_haras || 'Não informado'
                  }
                }).catch(err => {
                  console.log('Erro ao mostrar modal sem dados:', err);
                });
              });
            }
          });
          
          sendResponse({ 
            success: true, 
            token: data.data.access_token,
            // Retornar dados do haras para o modal
            nome_haras: data.data.nome_haras,
            email_haras: data.data.email_haras,
            cpf_cnpj_haras: data.data.cpf_cnpj_haras,
            id_haras: data.data.id_haras,
            message: data.message || 'Login realizado com sucesso!' 
          });
        });
      } else {
        sendResponse({ 
          success: false, 
          message: data.message || 'Login inválido! Verifique suas credenciais.' 
        });
      }
    })
    .catch(err => {
      let mensagemErro = 'Erro ao conectar com o servidor.';
      let detalhesDebug = '';
      
      // Tratamento específico para erros do axios
      if (err.response) {
        // Servidor respondeu com status de erro
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 401) {
          mensagemErro = 'Credenciais inválidas.';
          detalhesDebug = data?.message || 'Verifique se o email e senha estão corretos';
        } else if (status === 404) {
          mensagemErro = 'API não encontrada (404).';
          detalhesDebug = 'Verifique se o endpoint existe no servidor';
        } else if (status === 500) {
          mensagemErro = 'Erro interno do servidor (500).';
          detalhesDebug = 'Verifique os logs do servidor';
        } else if (status === 400) {
          mensagemErro = 'Dados inválidos ou formato incorreto (400).';
          detalhesDebug = data?.message || 'Possíveis causas: campos obrigatórios faltando ou formato incorreto';
        } else {
          mensagemErro = `Erro HTTP ${status}`;
          detalhesDebug = data?.message || err.response.statusText;
        }
      } else if (err.request) {
        // Requisição foi feita mas não houve resposta
        mensagemErro = 'Erro de rede ou CORS. Verifique:';
        detalhesDebug = '1) Se o servidor está rodando, 2) Se a URL está correta, 3) Se há bloqueio de rede';
      } else if (err.code === 'ECONNABORTED') {
        // Timeout
        mensagemErro = 'Timeout na requisição.';
        detalhesDebug = 'O servidor demorou muito para responder';
      } else {
        // Erro na configuração da requisição
        detalhesDebug = err.message;
      }
      
      console.error('Erro no login:', err);
      
      sendResponse({ 
        success: false, 
        message: mensagemErro === 'Credenciais inválidas.' ? 
          detalhesDebug || mensagemErro : 
          `${mensagemErro} | ${detalhesDebug}`
      });
    });
    
    return true; // Mantém o canal de resposta aberto para resposta assíncrona
  }

  if (message.action === "importarAnimal") {
    // Importar animal através do background script
    const dados = message.dados;

    // Buscar token do storage
    chrome.storage.local.get(['token'], function(result) {
      if (!result.token) {
        sendResponse({
          success: false,
          message: 'Token não encontrado. Faça login novamente.'
        });
        return;
      }

      // Usar a rota específica para importar dados
      const rota = `${API_BASE_URL}/importar_dados.php`;
      
      console.log('Enviando dados para importação:', dados);
      console.log('Rota da API:', rota);

      // Configurar requisição para importação
      const config = {
        method: 'POST',
        url: rota,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${result.token}`,
          'User-Agent': 'AgroBold-Extension/1.0'
        },
        data: dados, // nossa função axiosLike usa 'data' como axios
        timeout: 15000 // 15 segundos para importação
      };

      axiosLike(config)
      .then(response => {
        const data = response.data;
        const status = response.status;
        
        if (status === 200 || status === 201) {
          sendResponse({
            success: true,
            data: data,
            message: data.message || 'Animal importado com sucesso!'
          });
        } else {
          sendResponse({
            success: false,
            message: data.message || 'Erro na importação do animal'
          });
        }
      })
      .catch(err => {
        let mensagemErro = 'Erro ao importar animal.';
        let detalhesDebug = '';
        
        console.error('Erro na importação:', err);
        
        // Tratamento específico para erros do axios na importação
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          
          if (status === 401) {
            mensagemErro = 'Sessão expirada. Faça login novamente.';
            detalhesDebug = data?.message || 'Token inválido ou expirado';
          } else if (status === 422) {
            mensagemErro = 'Dados inválidos para importação.';
            detalhesDebug = data?.message || 'Verifique os dados do animal';
          } else if (status === 500) {
            mensagemErro = 'Erro interno do servidor. Tente novamente.';
            detalhesDebug = data?.message || 'Erro no processamento dos dados';
          } else if (status === 404) {
            mensagemErro = 'Endpoint de importação não encontrado.';
            detalhesDebug = 'Verifique se a API está configurada corretamente';
          } else {
            mensagemErro = `Erro HTTP ${status}`;
            detalhesDebug = data?.message || err.response.statusText;
          }
        } else if (err.request) {
          mensagemErro = 'Erro de conexão. Verifique sua internet.';
          detalhesDebug = 'Servidor não respondeu';
        } else if (err.code === 'ECONNABORTED') {
          mensagemErro = 'Timeout na importação.';
          detalhesDebug = 'O servidor demorou muito para processar os dados';
        } else {
          detalhesDebug = err.message;
        }
        
        sendResponse({ 
          success: false, 
          message: `${mensagemErro}${detalhesDebug ? ' - ' + detalhesDebug : ''}`
        });
      });
    });
    
    return true; // Mantém o canal de resposta aberto para resposta assíncrona
  }

  if (message.action === "logout") {
    // Fazer logout - limpar dados salvos
    chrome.storage.local.clear(function() {
      // Atualizar badge para mostrar que precisa fazer login
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
      
      sendResponse({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    });
    return true;
  }

  if (message.action === "testarConectividade") {
    // Testar conectividade da API usando o endpoint de validação
    const rota = `${API_BASE_URL}/validate_token.php`;

    fetch(rota, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'AgroBold-Extension/1.0'
      }
    })
    .then(response => {
      if (response.ok) {
        sendResponse({
          success: true,
          message: 'API acessível'
        });
      } else {
        sendResponse({
          success: false,
          message: `API retornou status ${response.status}`
        });
      }
    })
    .catch(err => {
      sendResponse({
        success: false,
        message: 'Erro de conectividade'
      });
    });
    
    return true; // Mantém o canal de resposta aberto para resposta assíncrona
  }

  if (message.action === "tokenExpirado") {
    // Token expirado, limpar dados e mostrar indicador
    
    // Mostrar badge indicando que precisa fazer login
    chrome.action.setBadgeText({
      text: "!"
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: "#ff4444"
    });
    
    // Limpar dados do storage
    chrome.storage.local.clear();
    
    sendResponse({ received: true });
    return true;
  }

  if (message.action === "dadosDetectados") {
    // Dados de animal detectados na ABCCMM
    
    // Mostrar badge indicando dados disponíveis
    chrome.action.setBadgeText({
      text: "📊"
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: "#2196F3"
    });
    
    // Sempre mostrar modal quando dados forem detectados
    chrome.storage.local.get(['token', 'harasInfo'], function(result) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          if (result.token) {
            // Usuário logado, mostrar modal com dados
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "mostrarModalLateral",
              dados: message.dados,
              userInfo: result.harasInfo
            }).catch(err => {
              // Content script pode não estar pronto ainda
            });
          } else {
            // Usuário não logado, mostrar modal sem dados mas com botão de login
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "mostrarModalSemDados",
              userInfo: null
            }).catch(err => {
              // Content script pode não estar pronto ainda
            });
          }
        }
      });
    });
    
    sendResponse({ received: true });
    return true;
  }

  if (message.action === "naoHaDados") {
    // Nenhum animal detectado - limpar badge e notificar modal
    console.log("Nenhum animal detectado, limpando dados...");
    
    // Limpar badge
    chrome.action.setBadgeText({ text: "" });
    
    // Limpar dados detectados do storage
    chrome.storage.local.remove('dadosDetectados');
    
    // Notificar modal para limpar dados e bloquear botão
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "limparDadosModal"
        }).catch(err => {
          console.log("Erro ao notificar modal para limpar dados:", err);
        });
      }
    });
    
    sendResponse({ received: true });
    return true;
  }

  if (message.action === "loginRedirect") {
    // Usuário foi redirecionado para login
    
    // Pode notificar o popup ou tomar outras ações
    chrome.action.setBadgeText({
      text: "!"
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: "#ff4444"
    });
    
    sendResponse({ received: true });
    return true;
  }

  if (message.action === "loginSuccess") {
    // Login realizado com sucesso
    
    // Limpar badge
    chrome.action.setBadgeText({
      text: ""
    });
    
    sendResponse({ received: true });
    return true;
  }

  if (message.action === "importCompleted") {
    // Importação concluída
    
    // Pode mostrar notificação
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon32.png',
      title: 'Importador AgroBold',
      message: message.message || 'Importação concluída com sucesso!'
    });
    
    sendResponse({ received: true });
    return true;
  }

  // Para outras mensagens, apenas confirmar recebimento
  sendResponse({ received: true });
  return true;
});

// Listener para quando a extensão é instalada ou atualizada
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Primeira instalação - verificar se já tem token e mostrar modal
    verificarTokenSalvo().then(() => {
      mostrarModalEmPaginasRelevantes();
    });
  } else if (details.reason === 'update') {
    // Atualização - manter token existente e mostrar modal
    verificarTokenSalvo().then(() => {
      mostrarModalEmPaginasRelevantes();
    });
  }
});

// Função para mostrar modal em páginas relevantes
function mostrarModalEmPaginasRelevantes() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      if (tab.url && (
        tab.url.includes('abccmm.org.br') || 
        tab.url.includes('agrobold.com.br') || 
        tab.url.includes('smartleiloes.digital')
      )) {
        chrome.storage.local.get(['token', 'harasInfo'], function(result) {
          if (result.token) {
            chrome.tabs.sendMessage(tab.id, {
              action: "mostrarModalSemDados",
              userInfo: result.harasInfo
            }).catch(() => {
              // Content script pode não estar carregado
            });
          } else {
            chrome.tabs.sendMessage(tab.id, {
              action: "mostrarModalSemDados",
              userInfo: null
            }).catch(() => {
              // Content script pode não estar carregado
            });
          }
        });
      }
    });
  });
}

// Listener para quando o Chrome é iniciado
chrome.runtime.onStartup.addListener(() => {
  // Verificar token ao iniciar o Chrome e mostrar modal
  verificarTokenSalvo().then(() => {
    mostrarModalEmPaginasRelevantes();
  });
});

// Listener para mudanças de abas
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Verificar se é uma das páginas monitoradas
    const urlsMonitoradas = [
      'https://www.abccmm.org.br/',
      'https://sistema.agrobold.com.br/',
      'https://sistema.smartleiloes.digital/'
    ];
    
    const isUrlMonitorada = urlsMonitoradas.some(url => tab.url.includes(url));
    
    if (isUrlMonitorada) {
      // Limpar badge se não estiver na página de login
      if (!tab.url.includes('/login')) {
        chrome.action.setBadgeText({
          text: ""
        });
      }
    }
  }
});