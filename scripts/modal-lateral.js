/**
 * Modal Lateral - Importador AgroBold
 * Exibe automaticamente os dados detectados em um modal lateral
 */

(function() {
  'use strict';
  
  // Verificar se estamos na URL específica da ABCCMM animais
  const currentUrl = window.location.href;
  
  // Lista de URLs que NÃO devem executar o modal
  const urlsExcluidas = [
    '/principais',
    '/criadores', 
    '/eventos',
    '/ranking',
    '/comunicacao',
    '/projetos',
    '/cursos',
    '/sistema',
    '/fale-conosco',
    '/seja-socio',
    '/parque-da-gameleira'
  ];
  
  // Verificar se está em uma URL excluída
  const isUrlExcluida = urlsExcluidas.some(path => currentUrl.includes(path));
  if (isUrlExcluida) {
    return;
  }
  
  // Verificar se é página de animais específica (só executar se houver animal detectado)
  const isAnimaisPage = currentUrl.includes('/animais') && 
                       (currentUrl.includes('abccmm.org.br')) &&
                       !currentUrl.includes('/animais/buscar') &&
                       !currentUrl.includes('/animais/lista') &&
                       !currentUrl.includes('/animais/pesquisa') &&
                       !currentUrl.includes('/animais?');
  
  if (!isAnimaisPage) {
    return;
  }
  
  // Verificar se há elemento de animal na página antes de prosseguir
  function temAnimalNaPagina() {
    const nomeElement = document.querySelector('#ContentPlaceHolder1_LblNomeAnimal');
    return nomeElement && nomeElement.textContent.trim() !== '';
  }
  
  // Só continuar se houver animal detectado
  if (!temAnimalNaPagina()) {
    // Aguardar um pouco para página carregar dinamicamente
    setTimeout(() => {
      if (!temAnimalNaPagina()) {
        return;
      } else {
        inicializarModal();
      }
    }, 2000);
    return;
  }
  
  inicializarModal();
  
  function inicializarModal() {
  
  let modalAtivo = false;
  let modalElement = null;
  let modalMinimizado = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // Função para salvar a posição do modal
  function salvarPosicaoModal() {
    if (!modalElement) return;
    
    const rect = modalElement.getBoundingClientRect();
    const posicao = {
      top: rect.top,
      left: rect.left,
      right: modalElement.style.right || 'auto',
      minimizado: modalMinimizado
    };
    
    localStorage.setItem('agrobold-modal-posicao', JSON.stringify(posicao));
  }

  // Função para carregar a posição do modal
  function carregarPosicaoModal() {
    try {
      const posicaoSalva = localStorage.getItem('agrobold-modal-posicao');
      if (posicaoSalva) {
        return JSON.parse(posicaoSalva);
      }
    } catch (error) {
      console.error('Erro ao carregar posição do modal:', error);
    }
    return null;
  }

  // Função para aplicar a posição salva do modal
  function aplicarPosicaoSalva() {
    if (!modalElement) return;
    
    const posicaoSalva = carregarPosicaoModal();
    if (posicaoSalva) {
      // Aplicar posição
      if (posicaoSalva.left !== undefined && posicaoSalva.left !== 'auto') {
        modalElement.style.left = posicaoSalva.left + 'px';
        modalElement.style.right = 'auto';
      }
      if (posicaoSalva.top !== undefined) {
        modalElement.style.top = posicaoSalva.top + 'px';
      }
      
      // Aplicar estado minimizado/maximizado
      const btnMinimize = modalElement.querySelector('.agrobold-modal-minimize');
      if (posicaoSalva.minimizado) {
        modalMinimizado = true;
        modalElement.classList.add('agrobold-minimized');
        if (btnMinimize) {
          btnMinimize.textContent = '+';
          btnMinimize.title = 'Maximizar';
        }
      } else {
        modalMinimizado = false;
        modalElement.classList.remove('agrobold-minimized');
        if (btnMinimize) {
          btnMinimize.textContent = '−';
          btnMinimize.title = 'Minimizar';
        }
      }
      
      // Garantir que o modal permaneça dentro da tela
      ajustarPosicaoNaTela();
    }
  }

  // Função para garantir que o modal permaneça dentro da tela
  function ajustarPosicaoNaTela() {
    if (!modalElement) return;
    
    const rect = modalElement.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    let needsAdjustment = false;
    let newLeft = rect.left;
    let newTop = rect.top;
    
    if (rect.left < 0) {
      newLeft = 0;
      needsAdjustment = true;
    } else if (rect.left > maxX) {
      newLeft = maxX;
      needsAdjustment = true;
    }
    
    if (rect.top < 0) {
      newTop = 0;
      needsAdjustment = true;
    } else if (rect.top > maxY) {
      newTop = maxY;
      needsAdjustment = true;
    }
    
    if (needsAdjustment) {
      modalElement.style.left = newLeft + 'px';
      modalElement.style.top = newTop + 'px';
      modalElement.style.right = 'auto';
      modalElement.style.transform = 'none';
    }
  }

  // Função para criar o modal lateral
  function criarModalLateral() {
    if (modalElement) {
      return modalElement;
    }

    // Container principal do modal
    const modal = document.createElement('div');
    modal.id = 'agrobold-modal-lateral';
    modal.innerHTML = `
      <div class="agrobold-modal-header" id="agrobold-modal-header">
        <div class="agrobold-header-content">
          <div class="agrobold-header-title">
            <img id="agrobold-header-icon" alt="Smart Leilões" class="agrobold-header-icon" />
            <h3>Importador AgroBold Smart Leilões</h3>
          </div>
          <div class="agrobold-header-buttons">
            <button class="agrobold-modal-minimize" title="Minimizar">−</button>
          </div>
        </div>
      </div>
      <div class="agrobold-minimized-info" id="agrobold-minimized-info" style="display: none;">
        <div class="agrobold-minimized-content">
          <span class="agrobold-minimized-animal" id="agrobold-minimized-animal">Animal detectado</span>
          <button class="agrobold-minimized-import" id="agrobold-minimized-import" title="Importar dados do animal">Importar</button>
          <button class="agrobold-minimized-login" id="agrobold-minimized-login" title="Fazer login" style="display: none;">Entrar</button>
        </div>
      </div>
      <div class="agrobold-modal-content" id="agrobold-modal-content">
        <div class="agrobold-user-section">
          <div class="agrobold-user-title">
            <h4>Dados Empresa Logada</h4>
          </div>
          <div class="agrobold-user-info">
            <div class="agrobold-user-details">
              <span id="agrobold-usuario-logado"></span>
            </div>
            <div class="agrobold-auth-buttons">
              <button id="agrobold-btn-login" class="agrobold-btn-login" style="display: none;">Entrar</button>
              <button id="agrobold-btn-logout" class="agrobold-btn-logout" style="display: none;">Sair</button>
            </div>
          </div>
        </div>
        <div class="agrobold-logo-expanded">
          <img id="agrobold-logo-expanded-img" alt="Smart Leilões" class="agrobold-logo-img" />
        </div>
        <div class="agrobold-dados-detectados">
          <h4>Dados Detectados:</h4>
          <div id="agrobold-info-dados"></div>
          <button id="agrobold-btn-importar" class="agrobold-btn-primary">
            Importar Dados Detectados
          </button>
        </div>
        <div class="agrobold-login-form" id="agrobold-login-form" style="display: none;">
          <h4>Fazer Login:</h4>
          <form id="agrobold-form-login">
            <div class="agrobold-form-group">
              <label for="agrobold-email">Email:</label>
              <input type="email" id="agrobold-email" required placeholder="Digite seu email">
            </div>
            <div class="agrobold-form-group">
              <label for="agrobold-senha">Senha:</label>
              <input type="password" id="agrobold-senha" required placeholder="Digite sua senha">
            </div>
            <div class="agrobold-form-buttons">
              <button type="submit" id="agrobold-btn-entrar" class="agrobold-btn-primary">Entrar</button>
              <button type="button" id="agrobold-btn-cancelar" class="agrobold-btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Estilos CSS do modal
    const styles = `
      #agrobold-modal-lateral {
        position: fixed;
        top: 10px;
        right: 20px;
        width: 450px;
        height: auto;
        max-height: 98vh;
        overflow: visible;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 999999;
        font-family: Arial, sans-serif;
        border: 1px solid #ddd;
        transform: translateX(100%);
        transition: transform 0.3s ease, width 0.3s ease, height 0.3s ease;
        cursor: move;
      }
      
      #agrobold-modal-lateral.agrobold-show {
        transform: translateX(0);
      }
      
      #agrobold-modal-lateral.agrobold-minimized {
        width: 420px;
        height: auto;
        min-height: 70px;
      }
      
      #agrobold-modal-lateral.agrobold-minimized .agrobold-modal-content {
        display: none;
      }
      
      .agrobold-modal-header {
        background: #2c5530;
        color: white;
        padding: 15px;
        border-radius: 8px 8px 0 0;
        cursor: move;
        user-select: none;
      }
      
      #agrobold-modal-lateral.agrobold-minimized .agrobold-modal-header {
        border-radius: 8px;
        padding: 10px 15px;
      }
      
      .agrobold-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .agrobold-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .agrobold-header-icon {
        width: 20px;
        height: 20px;
        filter: brightness(0) invert(1);
      }
      
      #agrobold-modal-lateral.agrobold-minimized .agrobold-header-icon {
        width: 18px;
        height: 18px;
      }
      
      .agrobold-modal-header h3 {
        margin: 0;
        font-size: 16px;
      }
      
      #agrobold-modal-lateral.agrobold-minimized .agrobold-modal-header h3 {
        font-size: 14px;
      }
      
      .agrobold-header-buttons {
        display: flex;
        gap: 5px;
      }
      
      .agrobold-modal-minimize {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 25px;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
      }
      
      .agrobold-modal-minimize:hover {
        background: rgba(255,255,255,0.2);
      }
      
      .agrobold-modal-content {
        padding: 20px;
        overflow: visible;
      }
      
      .agrobold-user-section {
        margin-bottom: 10px;
      }
      
      .agrobold-user-title {
        background: #2c5530;
        color: white;
        padding: 8px 15px;
        border-radius: 4px 4px 0 0;
        text-align: center;
        margin-bottom: 0;
      }
      
      .agrobold-user-title h4 {
        margin: 0;
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .agrobold-user-info {
        background: #f5f5f5;
        padding: 10px 15px;
        border-radius: 0 0 4px 4px;
        margin-bottom: 0;
        font-size: 12px;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .agrobold-user-details {
        flex: 1;
        text-align: left;
      }
      
      .agrobold-minimized-info {
        background: #e8f4fd;
        padding: 8px 20px;
        margin: 0;
        font-size: 11px;
        color: #323130;
        border-bottom: 1px solid #e1e1e1;
        animation: slideDown 0.3s ease;
      }
      
      .agrobold-minimized-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        max-width: 100%;
        box-sizing: border-box;
      }
      
      .agrobold-minimized-animal {
        font-weight: 500;
        font-size: 12px;
        color: #2c5530;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
        max-width: 350px;
      }
      
      .agrobold-minimized-import {
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 20px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        width: auto;
        min-width: 100px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .agrobold-minimized-import:hover {
        background: #45a049;
        transform: scale(1.05);
      }
      
      .agrobold-minimized-import:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
      
      .agrobold-minimized-login {
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 20px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        width: auto;
        min-width: 100px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .agrobold-minimized-login:hover {
        background: #1976D2;
        transform: scale(1.05);
      }
      
      .agrobold-logo-expanded {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
        margin: 10px 0 15px 0;
        border-top: 1px solid #e1e1e1;
        border-bottom: 1px solid #e1e1e1;
      }
      
      .agrobold-logo-expanded .agrobold-logo-img {
        width: 280px;
        height: auto;
        max-width: 280px;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
      }
      
      .agrobold-logo-text {
        font-size: 10px;
        font-weight: 600;
        color: #22C555;
        margin-top: 4px;
        text-align: center;
        letter-spacing: 0.5px;
      }
      
      .agrobold-minimized-count {
        
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        min-width: 16px;
        text-align: center;
      }
      
      #agrobold-modal-lateral.agrobold-minimized .agrobold-minimized-info {
        display: block !important;
      }
      
      #agrobold-modal-lateral:not(.agrobold-minimized) .agrobold-minimized-info {
        display: none !important;
      }
      
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .agrobold-auth-buttons {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .agrobold-btn-login {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
      }
      
      .agrobold-btn-login:hover {
        background: #45a049;
      }
      
      .agrobold-btn-logout {
        background: #f44336;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: bold;
      }
      
      .agrobold-btn-logout:hover {
        background: #da190b;
      }
      
      .agrobold-login-form {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      
      .agrobold-login-form h4 {
        margin: 0 0 15px 0;
        color: #2c5530;
        font-size: 14px;
      }
      
      .agrobold-form-group {
        margin-bottom: 12px;
      }
      
      .agrobold-form-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 12px;
        color: #333;
        font-weight: bold;
      }
      
      .agrobold-form-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 12px;
        box-sizing: border-box;
      }
      
      .agrobold-form-group input:focus {
        outline: none;
        border-color: #4CAF50;
      }
      
      .agrobold-form-buttons {
        display: flex;
        gap: 8px;
        margin-top: 15px;
      }
      
      .agrobold-btn-secondary {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        flex: 1;
      }
      
      .agrobold-btn-secondary:hover {
        background: #5a6268;
      }
      
      .agrobold-dados-detectados h4 {
        margin: 0 0 10px 0;
        color: #2c5530;
        font-size: 14px;
      }
      
      #agrobold-info-dados {
        background: #e8f5e8;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
        font-size: 13px;
        max-height: 400px;
        overflow-y: auto;
        overflow-x: hidden;
        word-wrap: break-word;
        box-sizing: border-box;
      }
      
      #agrobold-info-dados div {
        margin-bottom: 6px;
        padding: 4px 0;
        border-bottom: 1px dotted #ccc;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
        white-space: normal;
        max-width: 100%;
      }
      
      #agrobold-info-dados div:last-child {
        border-bottom: none;
      }
      
      #agrobold-info-dados hr {
        margin: 15px 0;
        border: none;
        border-top: 2px solid #2c5530;
      }
      
      .agrobold-btn-primary {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        width: 100%;
        transition: background-color 0.3s;
      }
      
      .agrobold-btn-primary:hover {
        background-color: #45a049;
      }
      
      .agrobold-btn-primary:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
    `;

    // Adicionar estilos à página
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Adicionar modal ao body
    document.body.appendChild(modal);
    modalElement = modal;

    // Definir src das logos e ícone do header usando chrome.runtime.getURL
    const logoExpandedImg = modal.querySelector('#agrobold-logo-expanded-img');
    const headerIcon = modal.querySelector('#agrobold-header-icon');
    
    if (headerIcon) {
      const iconUrl = chrome.runtime.getURL('icons/Icone_Smart_Leiloes_Branco.png');
      headerIcon.src = iconUrl;
      headerIcon.onerror = function() {
        console.error('Erro ao carregar ícone do header:', iconUrl);
        // Fallback: esconder o ícone se não carregar
        headerIcon.style.display = 'none';
      };
      headerIcon.onload = function() {
        console.log('Ícone do header carregado com sucesso:', iconUrl);
      };
    }
    
    if (logoExpandedImg) {
      const logoUrl = chrome.runtime.getURL('icons/logo-smart-leiloes.png');
      logoExpandedImg.src = logoUrl;
      logoExpandedImg.onerror = function() {
        console.error('Erro ao carregar logo expandida:', logoUrl);
        // Fallback: esconder a logo se não carregar
        logoExpandedImg.style.display = 'none';
      };
      logoExpandedImg.onload = function() {
        console.log('Logo expandida carregada com sucesso:', logoUrl);
      };
    }

    // Configurar eventos
    configurarEventos(modal);

    return modal;
  }

  // Função para configurar todos os eventos do modal
  function configurarEventos(modal) {
    const header = modal.querySelector('#agrobold-modal-header');
    const btnMinimize = modal.querySelector('.agrobold-modal-minimize');
    const btnLogin = modal.querySelector('#agrobold-btn-login');
    const btnLogout = modal.querySelector('#agrobold-btn-logout');
    const btnImportar = modal.querySelector('#agrobold-btn-importar');
    const formLogin = modal.querySelector('#agrobold-form-login');
    const btnCancelar = modal.querySelector('#agrobold-btn-cancelar');
    const btnLoginMinimizado = modal.querySelector('#agrobold-minimized-login');

    // Evento para minimizar/maximizar modal
    btnMinimize.addEventListener('click', toggleMinimizar);

    // Evento para mostrar formulário de login
    btnLogin.addEventListener('click', mostrarFormularioLogin);
    
    // Evento para botão de login minimizado
    if (btnLoginMinimizado) {
      btnLoginMinimizado.addEventListener('click', function() {
        // Maximizar o modal e mostrar formulário de login
        if (modalMinimizado) {
          toggleMinimizar();
        }
        setTimeout(() => {
          mostrarFormularioLogin();
        }, 100);
      });
    }

    // Evento para logout
    btnLogout.addEventListener('click', fazerLogout);

    // Evento para o formulário de login
    formLogin.addEventListener('submit', function(e) {
      e.preventDefault();
      processarLogin();
    });

    // Evento para cancelar login
    btnCancelar.addEventListener('click', esconderFormularioLogin);

    // Evento para importar dados
    btnImportar.addEventListener('click', function() {
      const dadosDetectados = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
      importarDados(dadosDetectados);
    });

    // Evento para botão de importação minimizado
    const btnImportarMinimizado = modal.querySelector('#agrobold-minimized-import');
    if (btnImportarMinimizado) {
      btnImportarMinimizado.addEventListener('click', function() {
        const dadosDetectados = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
        importarDados(dadosDetectados);
      });
    }

    // Eventos para arrastar o modal
    header.addEventListener('mousedown', iniciarArrastamento);
    document.addEventListener('mousemove', arrastar);
    document.addEventListener('mouseup', pararArrastamento);
  }

  // Função para iniciar o arrastamento
  function iniciarArrastamento(e) {
    isDragging = true;
    const rect = modalElement.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    modalElement.style.cursor = 'grabbing';
  }

  // Função para arrastar o modal
  function arrastar(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // Limitar às bordas da janela
    const maxX = window.innerWidth - modalElement.offsetWidth;
    const maxY = window.innerHeight - modalElement.offsetHeight;
    
    const limitedX = Math.max(0, Math.min(x, maxX));
    const limitedY = Math.max(0, Math.min(y, maxY));
    
    modalElement.style.left = limitedX + 'px';
    modalElement.style.top = limitedY + 'px';
    modalElement.style.right = 'auto';
    modalElement.style.transform = 'none';
  }

  // Função para parar o arrastamento
  function pararArrastamento() {
    isDragging = false;
    if (modalElement) {
      modalElement.style.cursor = 'move';
      // Salvar a nova posição
      salvarPosicaoModal();
    }
  }

  // Função para minimizar/maximizar o modal
  function toggleMinimizar() {
    modalMinimizado = !modalMinimizado;
    const btnMinimize = modalElement.querySelector('.agrobold-modal-minimize');
    
    if (modalMinimizado) {
      modalElement.classList.add('agrobold-minimized');
      btnMinimize.textContent = '+';
      btnMinimize.title = 'Maximizar';
    } else {
      modalElement.classList.remove('agrobold-minimized');
      btnMinimize.textContent = '−';
      btnMinimize.title = 'Minimizar';
    }
    
    // Salvar o estado atual
    salvarPosicaoModal();
    
    // Atualizar indicador minimizado
    atualizarIndicadorMinimizado();
  }

  // Função para fazer logout
  function fazerLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
      chrome.runtime.sendMessage({
        action: "logout"
      }, function(response) {
        if (response && response.success) {
          // Após logout, resetar modal para estado de não logado
          atualizarEstadoLogin(false);
          alert('Logout realizado com sucesso!');
        }
      });
    }
  }

  // Função para mostrar formulário de login
  function mostrarFormularioLogin() {
    const loginForm = modalElement.querySelector('#agrobold-login-form');
    const dadosSection = modalElement.querySelector('.agrobold-dados-detectados');
    
    // Mostrar formulário e esconder dados detectados
    loginForm.style.display = 'block';
    dadosSection.style.display = 'none';
    
    // Focar no campo email
    setTimeout(() => {
      const emailInput = modalElement.querySelector('#agrobold-email');
      if (emailInput) {
        emailInput.focus();
      }
    }, 100);
  }

  // Função para esconder formulário de login
  function esconderFormularioLogin() {
    const loginForm = modalElement.querySelector('#agrobold-login-form');
    const dadosSection = modalElement.querySelector('.agrobold-dados-detectados');
    
    // Esconder formulário
    loginForm.style.display = 'none';
    
    // Verificar se há dados detectados para mostrar a seção
    const dadosDetectados = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
    if ((dadosDetectados.Nome && dadosDetectados.Nome.trim() !== '') || 
        (dadosDetectados.Registro && dadosDetectados.Registro.trim() !== '')) {
      dadosSection.style.display = 'block';
    }
    
    // Limpar campos do formulário
    modalElement.querySelector('#agrobold-email').value = '';
    modalElement.querySelector('#agrobold-senha').value = '';
  }

  // Função para processar login
  function processarLogin() {
    const email = modalElement.querySelector('#agrobold-email').value.trim();
    const senha = modalElement.querySelector('#agrobold-senha').value;
    const btnEntrar = modalElement.querySelector('#agrobold-btn-entrar');
    
    if (!email || !senha) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    
    // Mostrar loading
    btnEntrar.textContent = 'Entrando...';
    btnEntrar.disabled = true;
    
    // Fazer login via background script
    chrome.runtime.sendMessage({
      action: "realizarLogin",
      email: email,
      senha: senha
    }, function(response) {
      if (response && response.success) {
        // Login bem-sucedido
        atualizarEstadoLogin(true, { 
          nome: response.nome_haras || 'Usuário', 
          cpfCnpj: response.cpf_cnpj_haras || response.cpf_haras || response.cnpj_haras || response.documento_haras || 'Não informado'
        });
        esconderFormularioLogin();
        alert('Login realizado com sucesso!');
      } else {
        // Login falhou
        alert(response ? response.message : 'Erro no login. Tente novamente.');
      }
      
      // Restaurar botão
      btnEntrar.textContent = 'Entrar';
      btnEntrar.disabled = false;
    });
  }

  // Função para atualizar estado de login do modal
  function atualizarEstadoLogin(logado, userInfo = null) {
    const btnLogin = modalElement.querySelector('#agrobold-btn-login');
    const btnLogout = modalElement.querySelector('#agrobold-btn-logout');
    const userInfoElement = modalElement.querySelector('#agrobold-usuario-logado');
    const dadosSection = modalElement.querySelector('.agrobold-dados-detectados');
    const loginForm = modalElement.querySelector('#agrobold-login-form');
    const btnImportar = modalElement.querySelector('#agrobold-btn-importar');
    
    if (logado) {
      // Usuário logado
      btnLogin.style.display = 'none';
      btnLogout.style.display = 'inline-block';
      loginForm.style.display = 'none';
      
      if (userInfo && (userInfo.nome || userInfo.cpfCnpj)) {
        userInfoElement.innerHTML = `${userInfo.nome}<br>${userInfo.cpfCnpj}`;
      } else {
        userInfoElement.innerHTML = 'Usuário logado';
      }
      
      // Habilitar botão de importar quando logado
      if (btnImportar) {
        btnImportar.disabled = false;
        btnImportar.textContent = 'Importar Dados Detectados';
        btnImportar.style.backgroundColor = '#4CAF50';
        btnImportar.style.cursor = 'pointer';
      }
      
      // Verificar se há dados detectados para mostrar
      const dadosDetectados = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
      if ((dadosDetectados.Nome && dadosDetectados.Nome.trim() !== '') || 
          (dadosDetectados.Registro && dadosDetectados.Registro.trim() !== '')) {
        // Atualizar dados no modal e mostrar seção
        atualizarDadosModal(dadosDetectados);
        dadosSection.style.display = 'block';
      }
    } else {
      // Usuário não logado
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      loginForm.style.display = 'none';
      dadosSection.style.display = 'none';
      
      // Bloquear botão de importar quando deslogado
      if (btnImportar) {
        btnImportar.disabled = true;
        btnImportar.textContent = 'Faça login para importar';
        btnImportar.style.backgroundColor = '#ccc';
        btnImportar.style.cursor = 'not-allowed';
      }
      
      userInfoElement.innerHTML = 'Faça login para continuar';
    }
    
    // Atualizar indicador minimizado
    atualizarIndicadorMinimizado();
  }

  // Função para mostrar o modal
  function mostrarModal(dados, userInfo) {
    const modal = criarModalLateral();
    
    // Determinar se usuário está logado baseado na presença de userInfo
    const estaLogado = !!(userInfo && (userInfo.nome || userInfo.email));
    
    // Atualizar estado de login
    atualizarEstadoLogin(estaLogado, userInfo);

    // Atualizar dados detectados se fornecidos
    if (dados && (dados.Nome || dados.Registro)) {
      atualizarDadosModal(dados);
      
      // Salvar dados nos storages para persistência
      sessionStorage.setItem('agrobold-dados-detectados', JSON.stringify(dados));
      localStorage.setItem('dadosAnimais', JSON.stringify(dados));
      
      // Se usuário está logado e há dados, mostrar seção de dados
      if (estaLogado) {
        const dadosSection = modal.querySelector('.agrobold-dados-detectados');
        if (dadosSection) {
          dadosSection.style.display = 'block';
        }
      }
    }

    // Mostrar modal com animação
    setTimeout(() => {
      modal.classList.add('agrobold-show');
      modal.style.display = 'block';
      modal.style.visibility = 'visible';
      
      // Aplicar posição salva ou minimizar automaticamente
      setTimeout(() => {
        aplicarPosicaoSalva();
        
        // Se não havia estado salvo como minimizado, forçar minimização
        const posicaoSalva = carregarPosicaoModal();
        if (!posicaoSalva || !posicaoSalva.minimizado) {
          if (!modalMinimizado) {
            toggleMinimizar();
          }
        }
        
        // Atualizar indicador minimizado
        atualizarIndicadorMinimizado();
      }, 200);
    }, 100);

    modalAtivo = true;
  }

  // Função para fechar o modal
  function fecharModal() {
    if (modalElement) {
      modalElement.classList.remove('agrobold-show');
      setTimeout(() => {
        if (modalElement && modalElement.parentNode) {
          modalElement.parentNode.removeChild(modalElement);
        }
        modalElement = null;
        modalAtivo = false;
      }, 300);
    }
  }

  // Função para importar dados
  function importarDados(dados) {
    // Mostrar confirmação antes de importar
    const nomeAnimal = dados.Nome || 'Animal';
    const registroAnimal = dados.Registro || 'N/A';
    
    const confirmacao = confirm(
      `Tem certeza que deseja importar esses dados?\n\n` +
      `Animal: ${nomeAnimal}\n` +
      `Registro: ${registroAnimal}\n\n` +
      'Nome da Mãe: ' + (dados.Mae || 'Desconhecida') + '\n' +
      'Nome do Pai: ' + (dados.pai || 'Desconhecido') + '\n' +
      `Clique em OK para confirmar a importação.`
    );
    
    if (!confirmacao) {
      return; // Usuário cancelou
    }
    
    const btnImportar = document.querySelector('#agrobold-btn-importar');
    btnImportar.textContent = 'Importando...';
    btnImportar.disabled = true;
    console.log('Importando dados:', dados);

    // Enviar dados para background script
    chrome.runtime.sendMessage({
      action: "importarAnimal",
      dados: dados
    }, function(response) {
      if (response && response.success) {
        // Sucesso - mostrar mensagem e minimizar modal
        alert('Animal importado com sucesso!');
        toggleMinimizar(); // Minimizar em vez de fechar
        
        // Limpar dados detectados
        chrome.storage.local.remove('dadosDetectados');
        sessionStorage.removeItem('agrobold-dados-detectados');
        
        // Esconder seção de dados
        const dadosSection = document.querySelector('.agrobold-dados-detectados');
        if (dadosSection) {
          dadosSection.style.display = 'none';
        }
      } else {
        // Erro - restaurar botão
        btnImportar.textContent = 'Importar Dados Detectados';
        btnImportar.disabled = false;
        alert(response ? response.message : 'Erro ao importar dados');
      }
    });
  }

  // Listener para mensagens do background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "mostrarModalLateral") {
      if (!modalAtivo) {
        mostrarModal(message.dados, message.userInfo);
      } else if (message.dados) {
        // Modal já ativo, apenas atualizar dados
        atualizarDadosModal(message.dados);
      }
      sendResponse({ received: true });
      return true;
    }
    
    if (message.action === "mostrarModalSemDados") {
      if (!modalAtivo) {
        mostrarModal(null, message.userInfo);
      }
      sendResponse({ received: true });
      return true;
    }
    
    if (message.action === "limparDadosModal") {
      // Limpar dados do modal e bloquear botão de importação
      console.log("Limpando dados do modal - nenhum animal detectado");
      
      if (modalElement) {
        const infoDados = modalElement.querySelector('#agrobold-info-dados');
        const dadosSection = modalElement.querySelector('.agrobold-dados-detectados');
        const btnImportar = modalElement.querySelector('#agrobold-btn-importar');
        
        // Limpar conteúdo dos dados
        if (infoDados) {
          infoDados.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 20px;">Nenhum animal detectado nesta página</div>';
        }
        
        // Bloquear botão de importação
        if (btnImportar) {
          btnImportar.disabled = true;
          btnImportar.textContent = 'Nenhum dado para importar';
          btnImportar.style.backgroundColor = '#ccc';
          btnImportar.style.cursor = 'not-allowed';
        }
        
        // Bloquear botão de importação minimizado
        const btnImportarMinimizado = modalElement.querySelector('#agrobold-minimized-import');
        if (btnImportarMinimizado) {
          btnImportarMinimizado.disabled = true;
        }
        
        // Esconder seção de dados se usuário não estiver logado
        chrome.storage.local.get(['token'], function(result) {
          if (!result.token && dadosSection) {
            dadosSection.style.display = 'none';
          }
        });
        
        // Limpar dados do sessionStorage
        sessionStorage.removeItem('agrobold-dados-detectados');
        
        // Atualizar indicador minimizado
        atualizarIndicadorMinimizado();
      }
      
      sendResponse({ received: true });
      return true;
    }
  });

  // Função para atualizar apenas os dados do modal existente
  function atualizarDadosModal(dados) {
    if (!modalElement || !dados) return;

    const infoDados = modalElement.querySelector('#agrobold-info-dados');
    const dadosSection = modalElement.querySelector('.agrobold-dados-detectados');
    
    if ((dados.Nome && dados.Nome.trim() !== '') || (dados.Registro && dados.Registro.trim() !== '')) {
      let html = '';
      
      // Dados básicos do animal
      if (dados.Nome && dados.Nome.trim() !== '') {
        html += `<div><strong>Nome:</strong> ${dados.Nome}</div>`;
      }
      if (dados.Registro && dados.Registro.trim() !== '') {
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
      if (dados.Criador) {
        html += `<div><strong>Criador:</strong> ${dados.Criador}</div>`;
      }
      if (dados.Proprietario) {
        html += `<div><strong>Proprietário:</strong> ${dados.Proprietario}</div>`;
      }
      if (dados.Livro) {
        html += `<div><strong>Livro:</strong> ${dados.Livro}</div>`;
      }
      if (dados.Chip) {
        html += `<div><strong>Chip:</strong> ${dados.Chip}</div>`;
      }
      if (dados.Exame) {
        html += `<div><strong>Exame:</strong> ${dados.Exame}</div>`;
      }
      if (dados.Vivo) {
        html += `<div><strong>Vivo:</strong> ${dados.Vivo}</div>`;
      }
      if (dados.Bloqueado) {
        html += `<div><strong>Bloqueado:</strong> ${dados.Bloqueado}</div>`;
      }

      // Genealogia - Linhagem Paterna
      if (dados.pai || dados.p01 || dados.p02 || dados.p03 || dados.p04 || dados.p05 || dados.p06) {
        html += `<hr style="margin: 15px 0; border: 1px solid #ddd;">`;
        html += `<div style="font-weight: bold; color: #2c5530; margin-bottom: 10px;">🐎 Linhagem Paterna</div>`;
        
        if (dados.pai) {
          html += `<div><strong>Pai:</strong> ${dados.pai}</div>`;
        }
        if (dados.p01) {
          html += `<div><strong>Avô Paterno:</strong> ${dados.p01}</div>`;
        }
        if (dados.p02) {
          html += `<div><strong>Avó Paterna:</strong> ${dados.p02}</div>`;
        }
        if (dados.p03) {
          html += `<div><strong>Bisavô Paterno (PP):</strong> ${dados.p03}</div>`;
        }
        if (dados.p04) {
          html += `<div><strong>Bisavó Paterna (PM):</strong> ${dados.p04}</div>`;
        }
        if (dados.p05) {
          html += `<div><strong>Bisavô Paterno (MP):</strong> ${dados.p05}</div>`;
        }
        if (dados.p06) {
          html += `<div><strong>Bisavó Paterna (MM):</strong> ${dados.p06}</div>`;
        }
      }

      // Genealogia - Linhagem Materna
      if (dados.Mae || dados.m01 || dados.m02 || dados.m03 || dados.m04 || dados.m05 || dados.m06) {
        html += `<hr style="margin: 15px 0; border: 1px solid #ddd;">`;
        html += `<div style="font-weight: bold; color: #2c5530; margin-bottom: 10px;">🐎 Linhagem Materna</div>`;
        
        if (dados.Mae) {
          html += `<div><strong>Mãe:</strong> ${dados.Mae}</div>`;
        }
        if (dados.m01) {
          html += `<div><strong>Avô Materno:</strong> ${dados.m01}</div>`;
        }
        if (dados.m02) {
          html += `<div><strong>Avó Materna:</strong> ${dados.m02}</div>`;
        }
        if (dados.m03) {
          html += `<div><strong>Bisavô Materno (PP):</strong> ${dados.m03}</div>`;
        }
        if (dados.m04) {
          html += `<div><strong>Bisavó Materna (PM):</strong> ${dados.m04}</div>`;
        }
        if (dados.m05) {
          html += `<div><strong>Bisavô Materno (MP):</strong> ${dados.m05}</div>`;
        }
        if (dados.m06) {
          html += `<div><strong>Bisavó Materna (MM):</strong> ${dados.m06}</div>`;
        }
      }
      
      infoDados.innerHTML = html;
      dadosSection.style.display = 'block';

      // Restaurar botão de importação quando há dados válidos (mas só se logado)
      const btnImportar = modalElement.querySelector('#agrobold-btn-importar');
      if (btnImportar) {
        chrome.storage.local.get(['token'], function(result) {
          if (result.token) {
            // Usuário logado - habilitar botão
            btnImportar.disabled = false;
            btnImportar.textContent = 'Importar Dados Detectados';
            btnImportar.style.backgroundColor = '#4CAF50';
            btnImportar.style.cursor = 'pointer';
          } else {
            // Usuário não logado - manter bloqueado
            btnImportar.disabled = true;
            btnImportar.textContent = 'Faça login para importar';
            btnImportar.style.backgroundColor = '#ccc';
            btnImportar.style.cursor = 'not-allowed';
          }
        });
      }

      // Salvar dados para importação
      sessionStorage.setItem('agrobold-dados-detectados', JSON.stringify(dados));
      
      // Atualizar indicador minimizado
      atualizarIndicadorMinimizado();
    }
  }

  // Listener para mensagens via postMessage (fallback)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'AGROBOLD_MOSTRAR_MODAL') {
      if (event.data.dados && !modalAtivo) {
        mostrarModal(event.data.dados, event.data.userInfo);
      }
    }
  });

  // Função para atualizar o indicador minimizado
  function atualizarIndicadorMinimizado() {
    const minimizedInfo = modalElement?.querySelector('#agrobold-minimized-info');
    const minimizedAnimal = modalElement?.querySelector('#agrobold-minimized-animal');
    const minimizedImport = modalElement?.querySelector('#agrobold-minimized-import');
    const minimizedLogin = modalElement?.querySelector('#agrobold-minimized-login');
    
    if (!minimizedInfo || !minimizedAnimal || !minimizedImport || !minimizedLogin) return;

    // Primeiro, verificar se já temos dados completos salvos
    const dadosStorage = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
    const dadosLocal = JSON.parse(localStorage.getItem('dadosAnimais') || '{}');
    
    // Verificar se os dados salvos já têm mais informações que apenas Nome/Registro
    const temDadosCompletos = dadosStorage && (
      dadosStorage.Sexo || dadosStorage.Nascimento || dadosStorage.Pelagem || 
      dadosStorage.Criador || dadosStorage.Proprietario || dadosStorage.pai || dadosStorage.Mae
    );
    
    let dadosDetectados = dadosStorage;
    
    // Só extrair dados da página se não temos dados completos salvos
    if (!temDadosCompletos) {
      const nomeElemento = document.querySelector('#ContentPlaceHolder1_LblNomeAnimal');
      const registroElemento = document.querySelector('#ContentPlaceHolder1_LblRegistro');
      
      let dadosAtuais = {};
      if (nomeElemento && nomeElemento.textContent.trim()) {
        dadosAtuais.Nome = nomeElemento.textContent.trim();
      }
      if (registroElemento && registroElemento.textContent.trim()) {
        dadosAtuais.Registro = registroElemento.textContent.trim();
      }
      
      // Se há dados na página e não temos dados completos, salvar
      if ((dadosAtuais.Nome || dadosAtuais.Registro) && !temDadosCompletos) {
        sessionStorage.setItem('agrobold-dados-detectados', JSON.stringify(dadosAtuais));
        localStorage.setItem('dadosAnimais', JSON.stringify(dadosAtuais));
        chrome.storage.local.set({ dadosDetectados: dadosAtuais });
        dadosDetectados = dadosAtuais;
      }
    }
    
    // Usar dados salvos como fallback se não há dados atuais
    if (!dadosDetectados || (!dadosDetectados.Nome && !dadosDetectados.Registro)) {
      dadosDetectados = (dadosStorage.Nome || dadosStorage.Registro) ? dadosStorage : dadosLocal;
    }
    
    const hasDados = (dadosDetectados.Nome && dadosDetectados.Nome.trim() !== '') || 
                     (dadosDetectados.Registro && dadosDetectados.Registro.trim() !== '');

    // Verificar se realmente estamos em uma página de animal específico
    const urlAtual = window.location.href;
    const isPaginaAnimalEspecifica = urlAtual.includes('/animais') && 
                                    urlAtual.includes('abccmm.org.br') &&
                                    !urlAtual.includes('/animais/buscar') &&
                                    !urlAtual.includes('/animais/lista') &&
                                    !urlAtual.includes('/animais/pesquisar') &&
                                    !urlAtual.includes('/animais/ranking');
    
    if (hasDados && isPaginaAnimalEspecifica) {
      // Mostrar nome do animal ou registro como fallback
      const nomeAnimal = (dadosDetectados.Nome && dadosDetectados.Nome.trim()) || 
                        (dadosDetectados.Registro && dadosDetectados.Registro.trim()) || 
                        'Animal sem nome';
      minimizedAnimal.textContent = nomeAnimal;
      
      // Verificar se usuário está logado para habilitar botão
      chrome.storage.local.get(['token'], function(result) {
        if (result.token) {
          // Usuário logado - mostrar botão de importar, esconder botão de login
          minimizedImport.disabled = false;
          minimizedImport.title = 'Importar dados do animal';
          minimizedImport.style.display = 'flex';
          minimizedLogin.style.display = 'none';
        } else {
          // Usuário não logado - esconder botão de importar, mostrar botão de login
          minimizedImport.style.display = 'none';
          minimizedLogin.style.display = 'flex';
        }
      });
      
      // O CSS já controla a exibição baseado na classe agrobold-minimized
    } else {
      // Não há dados válidos OU não é página de animal específica
      // Forçar esconder o indicador imediatamente
      if (minimizedInfo) {
        minimizedInfo.style.display = 'none !important';
        minimizedInfo.style.visibility = 'hidden !important';
      }
      
      // Limpar o texto do animal para evitar exibição residual
      if (minimizedAnimal) {
        minimizedAnimal.textContent = '';
      }
      
      // Desabilitar e esconder botões
      if (minimizedImport) {
        minimizedImport.disabled = true;
        minimizedImport.style.display = 'none';
      }
      
      if (minimizedLogin) {
        minimizedLogin.style.display = 'none';
      }
      
      // Limpar dados inválidos do sessionStorage
      sessionStorage.removeItem('agrobold-dados-detectados');
      
      // Limpar dados inválidos do chrome.storage.local
      chrome.storage.local.remove('dadosDetectados');
      
      // Limpar badge se não há dados válidos
      chrome.runtime.sendMessage({
        action: "naoHaDados"
      }).catch((err) => {
        console.log("Erro ao enviar mensagem de ausência de dados:", err);
      });
    }
  }

  // Verificar estado inicial e sempre mostrar o modal
  chrome.storage.local.get(['token', 'dadosDetectados', 'harasInfo'], function(result) {
    console.log('Storage carregado no modal inicial:', result);
    
    // Verificar novamente se estamos em uma página válida
    const urlAtual = window.location.href;
    const isPaginaValida = urlAtual.includes('/animais') && 
                          urlAtual.includes('abccmm.org.br') &&
                          !urlAtual.includes('/animais/buscar') &&
                          !urlAtual.includes('/animais/lista');
    
    if (!isPaginaValida) {
      console.log('Página não é válida para dados de animal, limpando dados...');
      chrome.storage.local.remove('dadosDetectados');
      sessionStorage.removeItem('agrobold-dados-detectados');
      return;
    }
    
    if (!modalAtivo) {
      setTimeout(() => {
        if (result.token) {
          // Usuário logado - mostrar modal (validação será feita no atualizarIndicadorMinimizado)
          mostrarModal(result.dadosDetectados || null, result.harasInfo);
        } else {
          // Usuário não logado - mostrar modal para permitir login
          mostrarModal(result.dadosDetectados || null, null);
        }
      }, 1000);
    }
  });

  // Garantir que o modal aparece sempre, mesmo após recarregar a página
  window.addEventListener('load', function() {
    setTimeout(() => {
      if (!modalAtivo) {
        chrome.storage.local.get(['token', 'harasInfo', 'dadosDetectados'], function(result) {
          if (result.token) {
            mostrarModal(result.dadosDetectados || null, result.harasInfo);
          } else {
            mostrarModal(result.dadosDetectados || null, null);
          }
        });
      }
    }, 2000);
  });

  // Ajustar posição do modal quando a janela for redimensionada
  window.addEventListener('resize', function() {
    if (modalElement) {
      setTimeout(() => {
        ajustarPosicaoNaTela();
        salvarPosicaoModal();
      }, 100);
    }
  });

  } // Fechamento da função inicializarModal

})();
