/**
 * Configuração da API AgroBold
 * Gerencia conexões HTTP usando Background Script para evitar CORS
 */

// Proteção contra conflitos com frameworks do servidor
(function() {
  'use strict';
  
  // Verificar se estamos em um ambiente válido
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('AgroBold API: Ambiente Chrome Extension não detectado');
    return;
  }

// Classe para gerenciar as requisições da API
class AgroBoldAPI {
  constructor() {
    console.log('AgroBold API inicializada - usando Background Script para requisições');
  }

  // Método para fazer login via background script
  async login(email, senha) {
    try {
      console.log('Enviando requisição de login via background script...');
      
      const response = await chrome.runtime.sendMessage({
        action: "realizarLogin",
        email: email,
        senha: senha
      });

      if (response.success) {
        return {
          success: true,
          token: response.token,
          message: response.message || 'Login realizado com sucesso!'
        };
      } else {
        return {
          success: false,
          message: response.message || 'Credenciais inválidas'
        };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: 'Erro de comunicação com o servidor. Tente novamente.'
      };
    }
  }

  // Método para importar animal via background script
  async importarAnimal(dadosAnimal) {
    try {
      console.log('Enviando requisição de importação via background script...');
      
      const response = await chrome.runtime.sendMessage({
        action: "importarAnimal", 
        dados: dadosAnimal
      });

      if (response && response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || 'Animal importado com sucesso!'
        };
      } else {
        return {
          success: false,
          message: response?.message || 'Erro na importação do animal'
        };
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      return {
        success: false,
        message: 'Erro de comunicação durante a importação. Tente novamente.'
      };
    }
  }

  // Método para buscar dados do storage
  buscarStorage(chaves) {
    return new Promise((resolve) => {
      chrome.storage.local.get(chaves, resolve);
    });
  }

  // Método para salvar dados no storage
  salvarStorage(dados) {
    return new Promise((resolve) => {
      chrome.storage.local.set(dados, resolve);
    });
  }

  // Método para testar conectividade via background script
  async testarConectividade() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "testarConectividade"
      });
      
      return {
        success: response?.success || false,
        message: response?.message || 'Erro na conectividade'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro de comunicação com o background script'
      };
    }
  }
}

// Criar instância global da API
const agroBoldAPI = new AgroBoldAPI();

// Expor no escopo global para uso em outros scripts
if (typeof window !== 'undefined') {
  window.agroBoldAPI = agroBoldAPI;
}

console.log('AgroBold API configurada com sucesso (via Background Script)!');

})(); // Fechamento da IIFE
