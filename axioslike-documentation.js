/**
 * Função axiosLike - Alternativa ao Axios para Chrome Extension Service Workers
 * 
 * O Axios não funciona nativamente em service workers devido à falta de XMLHttpRequest.
 * Esta função simula a API do axios usando fetch nativo, mantendo a mesma sintaxe
 * e estrutura de tratamento de erros.
 */

async function axiosLike(config) {
  const { method = 'GET', url, headers = {}, data, timeout = 10000 } = config;
  
  // Usar AbortController para implementar timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Configurar opções do fetch
    const fetchOptions = {
      method,
      headers,
      signal: controller.signal
    };
    
    // Adicionar body apenas para métodos que suportam
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data);
    }
    
    // Fazer a requisição
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    // Parse automático do JSON
    const responseData = await response.json();
    
    // Se não for sucesso, criar erro com estrutura similar ao axios
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      };
      throw error;
    }
    
    // Retornar estrutura similar ao axios
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText
    };
    
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Tratar timeout
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      throw timeoutError;
    }
    
    // Marcar erros de rede (sem response)
    if (!err.response) {
      err.request = true;
    }
    
    throw err;
  }
}

// Exemplos de uso:

// 1. LOGIN (GET com parâmetros)
const loginConfig = {
  method: 'GET',
  url: 'http://api.exemplo.com/login.php?email=test@test.com&senha=123',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'AgroBold-Extension/1.0'
  },
  timeout: 10000
};

axiosLike(loginConfig)
  .then(response => {
    console.log('Login sucesso:', response.data);
  })
  .catch(err => {
    if (err.response) {
      console.error('Erro da API:', err.response.status, err.response.data);
    } else if (err.request) {
      console.error('Erro de rede');
    } else if (err.code === 'ECONNABORTED') {
      console.error('Timeout');
    }
  });

// 2. IMPORTAÇÃO (POST com dados)
const importConfig = {
  method: 'POST',
  url: 'http://api.exemplo.com/importar_dados.php',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  data: {
    Nome: 'Cavalo Exemplo',
    Registro: 'ABC123'
  },
  timeout: 15000
};

axiosLike(importConfig)
  .then(response => {
    console.log('Importação sucesso:', response.data);
  })
  .catch(err => {
    console.error('Erro na importação:', err);
  });

/**
 * VANTAGENS da função axiosLike:
 * 
 * ✅ Funciona em Chrome Extension Service Workers
 * ✅ Sintaxe idêntica ao axios
 * ✅ Timeout configurável
 * ✅ Tratamento de erro estruturado
 * ✅ JSON parsing automático
 * ✅ Sem dependências externas
 * ✅ AbortController para cancelamento
 * ✅ Compatível com manifest v3
 */
