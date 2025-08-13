document.addEventListener('DOMContentLoaded', function () {
  const loginDiv = document.getElementById('login');
  const conteudoDiv = document.getElementById('conteudo');

  // Função para mostrar conteúdo logado
  function mostrarConteudoLogado(email) {
    loginDiv.style.display = 'none';
    conteudoDiv.style.display = 'block';
    
    // Mostrar informações do usuário logado
    const usuarioLogado = document.getElementById('usuario-logado');
    if (usuarioLogado) {
      // Verificar se há informações do haras salvas
      chrome.storage.local.get(['harasInfo'], function(result) {
        if (result.harasInfo && result.harasInfo.nome) {
          usuarioLogado.textContent = `${result.harasInfo.nome}`;
        } else {
          usuarioLogado.textContent = `Logado como: ${email}`;
        }
      });
    }
    
    // Verificar se há dados detectados para mostrar automaticamente
    verificarDadosDetectados();
  }

  // Função separada para verificar dados detectados
  function verificarDadosDetectados() {
    chrome.storage.local.get(['dadosDetectados'], function (result) {
      if (result.dadosDetectados) {
        mostrarDadosDetectados(result.dadosDetectados);
      } else {
        // Se não há dados salvos, verificar se estamos numa página da ABCCMM
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('abccmm.org.br')) {
            // Solicitar que o content script detecte novamente os dados
            chrome.tabs.sendMessage(tabs[0].id, {action: "redetectarDados"}, function(response) {
              if (response && response.dados) {
                mostrarDadosDetectados(response.dados);
              }
            });
          }
        });
      }
    });
    
    // Verificar novamente após 2 segundos caso não tenha encontrado dados na primeira tentativa
    setTimeout(() => {
      chrome.storage.local.get(['dadosDetectados'], function (result) {
        if (result.dadosDetectados && document.getElementById('dados-detectados').style.display === 'none') {
          mostrarDadosDetectados(result.dadosDetectados);
        }
      });
    }, 2000);
  }

  // Função para mostrar tela de login
  function mostrarTelaLogin() {
    loginDiv.style.display = 'block';
    conteudoDiv.style.display = 'none';
  }

  // Verificar se já está logado através do background script
  chrome.runtime.sendMessage({
    action: "verificarLogin"
  }, function(response) {
    if (response && response.success && response.logado) {
      // Já está logado, mostrar conteúdo do importador
      mostrarConteudoLogado(response.email);
      
      // Se há dados detectados, fechar popup pois modal lateral será mostrado
      chrome.storage.local.get(['dadosDetectados'], function(result) {
        if (result.dadosDetectados) {
          // Disparar modal lateral na página ativa
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && (tabs[0].url.includes('abccmm.org.br') || 
                           tabs[0].url.includes('agrobold.com.br') || 
                           tabs[0].url.includes('smartleiloes.digital'))) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "mostrarModalLateral",
                dados: result.dadosDetectados,
                userInfo: response.haras
              }).catch(err => {
                // Content script pode não estar pronto
              });
              
              // Fechar popup após um breve delay
              setTimeout(() => {
                window.close();
              }, 500);
            }
          });
        }
      });
    } else {
      // Precisa fazer login, mostrar formulário
      mostrarTelaLogin();
    }
  });

  // Evento de login
  document.getElementById('btnLogin').addEventListener('click', function () {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const btnLogin = document.getElementById('btnLogin');
    
    // Validação básica
    if (!email || !senha) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    
    // Mostrar loading
    btnLogin.textContent = 'Entrando...';
    btnLogin.disabled = true;
    
    // Usar background script para login (mais confiável para extensões)
    chrome.runtime.sendMessage({
      action: "realizarLogin",
      email: email,
      senha: senha
    }, function(response) {
      // Restaurar botão
      btnLogin.textContent = 'Entrar';
      btnLogin.disabled = false;
      
      if (response && response.success) {
        // Login bem-sucedido - usar função para mostrar conteúdo
        mostrarConteudoLogado(email);
        
        // Notificar o background sobre login bem-sucedido
        chrome.runtime.sendMessage({
          action: "loginSuccess",
          message: "Login realizado com sucesso"
        }).catch(err => {
          console.log("Erro ao enviar mensagem de login:", err);
        });
      } else {
        // Login falhou
        const mensagem = response ? response.message : 'Erro desconhecido no login';
        alert(mensagem);
      }
    });
  });

  // Evento de logout
  document.getElementById('logout').addEventListener('click', function () {
    // Usar background script para logout
    chrome.runtime.sendMessage({
      action: "logout"
    }, function(response) {
      if (response && response.success) {
        // Usar função para mostrar tela de login
        mostrarTelaLogin();
        
        // Limpar campos do formulário
        document.getElementById('email').value = '';
        document.getElementById('senha').value = '';
      }
    });
  });
  
  // Permitir login com Enter
  document.getElementById('senha').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('btnLogin').click();
    }
  });
});

// Função para mostrar dados detectados
function mostrarDadosDetectados(dados) {
  const divDados = document.getElementById('dados-detectados');
  const infoDados = document.getElementById('info-dados-detectados');
  
  if (dados && (dados.Nome || dados.Registro)) {
    let html = '<div style="font-size: 14px;">';
    
    if (dados.Nome) {
      html += `<div><strong>Nome:</strong> ${dados.Nome}</div>`;
    }
    if (dados.Registro) {
      html += `<div><strong>Registro:</strong> ${dados.Registro}</div>`;
    }
    if (dados.Sexo) {
      html += `<div><strong>Sexo:</strong> ${dados.Sexo}</div>`;
    }
    if (dados.Nascimento) {
      html += `<div><strong>Nascimento:</strong> ${dados.Nascimento}</div>`;
    }
    if (dados.Pelagem) {
      html += `<div><strong>Pelagem:</strong> ${dados.Pelagem}</div>`;
    }
    
    html += '</div>';
    
    infoDados.innerHTML = html;
    divDados.style.display = 'block';
    
    // Remover event listener anterior e adicionar novo (para evitar duplicação)
    const btnImportar = document.getElementById('btn-importar-detectados');
    const novoBtn = btnImportar.cloneNode(true);
    btnImportar.parentNode.replaceChild(novoBtn, btnImportar);
    
    // Adicionar evento no botão de importar
    document.getElementById('btn-importar-detectados').addEventListener('click', function() {
      importarDadosDetectados(dados);
    });
  } else {
    divDados.style.display = 'none';
  }
}

// Função para importar dados detectados
function importarDadosDetectados(dados) {
  // Salvar dados para importação
  chrome.storage.local.set({ 
    savedData: dados 
  }, function() {
    // Abrir página de importação
    const urlImportacao = 'https://sistema.smartleiloes.digital/cadastros/animais/';
    
    chrome.tabs.create({ url: urlImportacao });
    
    // Limpar dados detectados
    chrome.storage.local.remove('dadosDetectados');
    
    // Fechar popup
    window.close();
  });
}