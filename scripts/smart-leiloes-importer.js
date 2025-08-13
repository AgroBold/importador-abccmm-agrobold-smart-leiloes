/**
 * Importador de Animais - Smart Leilões
 * Este script preenche automaticamente o formulário de cadastro de animais
 * no sistema Smart Leilões com dados importados da ABCCMM
 */

// Proteção contra conflitos com frameworks do servidor
(function() {
  'use strict';
  
  // Evitar conflitos com ASP.NET AJAX
  if (typeof Sys !== 'undefined' && Sys.WebForms) {
    console.log('ASP.NET AJAX detectado, aguardando carregamento completo...');
    if (Sys.WebForms.PageRequestManager) {
      var prm = Sys.WebForms.PageRequestManager.getInstance();
      if (prm) {
        prm.add_endRequest(function() {
          console.log('ASP.NET AJAX carregamento concluído');
        });
      }
    }
  }

// Variável global para controlar o processo de importação
window._importacaoEmAndamento = false;
// Salvar os manipuladores originais
window._handlersOriginais = {};

// Verificar se estamos na página de login - SEM QUEBRAR A EXECUÇÃO
if (window.location.href.includes("/login")) {
  console.log("Usuário redirecionado para a página de login");
  
  // Enviar mensagem para o background script informando sobre o redirecionamento
  chrome.runtime.sendMessage({
    action: "loginRedirect",
    message: "Redirecionado para a página de login",
  }).catch(err => {
    console.log("Erro ao enviar mensagem:", err);
  });

  // NÃO FAZER THROW - apenas retornar
  console.log("Login necessário, aguardando usuário fazer login...");
} else {
  // Se não estiver na página de login, inicializar o importador
  inicializarImportador();
}

function inicializarImportador() {
  console.log("Inicializando importador de animais...");
  
  // Verificar se há dados salvos para importar
  chrome.storage.local.get(["savedData", "tempFormData"], function (result) {
    if (result.savedData) {
      preencherFormularioAnimal(result.savedData);

      chrome.storage.local.set(
        { tempFormData: result.savedData },
        function () {
          chrome.storage.local.remove("savedData", function () {
            console.log("Dados salvos processados e removidos");
          });
        }
      );
    } else if (result.tempFormData && !result.tempFormData._processed) {
      const marcadoProcessado = { ...result.tempFormData, _processed: true };
      chrome.storage.local.set(
        { tempFormData: marcadoProcessado },
        function () {
          // Reatualizar raça após delay
          setTimeout(() => {
            selecionarRaca("raca_animal", "19");
          }, 1000);
        }
      );
    }
  });
}

function verificarModalAberto() {
  if (!window.location.href.includes("/cadastros/animais")) {
    return false;
  }

  if (window._importacaoEmAndamento === true) {
    return true;
  }

  const modal = document.getElementById("modal_cadastro_animais");
  if (!modal) {
    return false;
  }

  const formularioAcessivel = document.getElementById("nome_animal") !== null;

  if (!formularioAcessivel) {
    return false;
  }

  return true;
}

// Função para iniciar o processo de importação e bloquear o fechamento do modal
function iniciarImportacao() {
  if (window._importacaoEmAndamento) {
    return; // Já está em andamento
  }

  window._importacaoEmAndamento = true;
  console.log("🚀 Processo de importação iniciado");

  // Proteger o modal contra fechamento
  protegerModal();
}

// Função para finalizar o processo de importação
function finalizarImportacao() {
  window._importacaoEmAndamento = false;
  desprotegerModal();
}

// Função para proteger o modal contra fechamento
function protegerModal() {
  const btnFechar = document.querySelector("#modal_cadastro_animais .close");
  if (btnFechar) {
    // Salvar o handler original
    window._handlersOriginais.btnFechar = btnFechar.onclick;

    // Sobrescrever o handler
    btnFechar.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
  }

  document.addEventListener("keydown", bloquearEsc);

  const backdrop = document.querySelector(".modal-backdrop");
  if (backdrop) {
    window._handlersOriginais.backdrop = backdrop.onclick;

    backdrop.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
  }

  if (window.jQuery) {
    window._handlersOriginais.jqueryModal = window.jQuery.fn.modal;

    window.jQuery.fn.modal = function (action) {
      if (action === "hide" && this.is("#modal_cadastro_animais")) {
        return this;
      }
      return window._handlersOriginais.jqueryModal.apply(this, arguments);
    };
  }
}

function desprotegerModal() {
  // 1. Restaurar handler do botão de fechar
  const btnFechar = document.querySelector("#modal_cadastro_animais .close");
  if (btnFechar && window._handlersOriginais.btnFechar) {
    btnFechar.onclick = window._handlersOriginais.btnFechar;
  }

  document.removeEventListener("keydown", bloquearEsc);

  const backdrop = document.querySelector(".modal-backdrop");
  if (backdrop && window._handlersOriginais.backdrop) {
    backdrop.onclick = window._handlersOriginais.backdrop;
  }

  if (window.jQuery && window._handlersOriginais.jqueryModal) {
    window.jQuery.fn.modal = window._handlersOriginais.jqueryModal;
  }
}

// Função para bloquear o fechamento por ESC
function bloquearEsc(e) {
  if (e.key === "Escape" || e.keyCode === 27) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function fecharModal() {
  finalizarImportacao();

  const btnFechar = document.querySelector("#modal_cadastro_animais .close");
  if (btnFechar) {
    btnFechar.click();
    return true;
  }

  // Método 2: Usar jQuery (se disponível)
  if (window.jQuery && window.jQuery("#modal_cadastro_animais").length) {
    window.jQuery("#modal_cadastro_animais").modal("hide");
    return true;
  }

  const modal = document.getElementById("modal_cadastro_animais");
  if (modal) {
    modal.classList.remove("in");
    modal.style.display = "none";

    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) {
      backdrop.parentNode.removeChild(backdrop);
    }
    document.body.classList.remove("modal-open");
    document.body.style.paddingRight = "";

    return true;
  }

  return false;
}

// Função para preenchimento do formulário com dados da API
async function preencherFormularioComAPI(dados) {
  try {
    console.log('Tentando importar dados usando API Axios...', dados);
    
    if (typeof agroBoldAPI !== 'undefined') {
      // Usar a API Axios para importação
      const resultado = await agroBoldAPI.importarAnimal(dados);
      
      if (resultado.success) {
        notificarSucesso('Animal importado com sucesso via API!');
        
        // Enviar notificação para background
        chrome.runtime.sendMessage({
          action: "importCompleted",
          message: "Animal importado com sucesso via API"
        }).catch(err => {
          console.log("Erro ao enviar mensagem de importação:", err);
        });
        
        return true;
      } else {
        console.log('Falha na API, usando método de preenchimento manual...');
        return false;
      }
    } else {
      console.log('API Axios não disponível, usando método manual...');
      return false;
    }
  } catch (error) {
    console.error('Erro ao usar API:', error);
    return false;
  }
}

function preencherFormularioAnimal(dados) {
  try {
    // Primeiro tentar usar a API
    preencherFormularioComAPI(dados).then(apiSuccess => {
      if (!apiSuccess) {
        // Se a API falhar, usar o método manual original
        console.log('Usando método de preenchimento manual...');
        preencherFormularioManual(dados);
      }
    }).catch(error => {
      console.error('Erro na tentativa de API, usando método manual:', error);
      preencherFormularioManual(dados);
    });
  } catch (error) {
    notificarErro("Ocorreu um erro ao iniciar a importação: " + error.message);
    finalizarImportacao();
  }
}

function preencherFormularioManual(dados) {
  try {
    // Verificar se estamos na página de login antes de prosseguir
    if (window.location.href.includes("/login")) {
      notificarErro("Você foi redirecionado para a página de login. Por favor, faça login e tente novamente.");
      return;
    }

    // Iniciar o processo de importação
    iniciarImportacao();

    // Verificar se o modal está aberto antes de prosseguir
    if (!verificarModalAberto()) {
      const btnModal = document.querySelector('button[data-target="#modal_cadastro_animais"]');
      if (btnModal) {
        btnModal.click();
        setTimeout(() => {
          if (verificarModalAberto()) {
            setTimeout(() => {
              preencherCamposFormulario(dados);
            }, 1000);
          } else {
            notificarErro("Não foi possível abrir o formulário de cadastro. Tente novamente.");
            finalizarImportacao();
          }
        }, 1500);
      } else {
        notificarErro("Não foi possível encontrar o botão para abrir o formulário de cadastro. Tente novamente.");
        finalizarImportacao();
      }
    } else {
      setTimeout(() => {
        preencherCamposFormulario(dados);
      }, 1000);
    }
  } catch (error) {
    notificarErro("Ocorreu um erro ao iniciar a importação manual: " + error.message);
    finalizarImportacao();
  }
}

function preencherCamposFormulario(dados) {
  try {
    // Verificar novamente se o modal está aberto
    if (!verificarModalAberto()) {
      notificarErro("O formulário de cadastro foi fechado. Tente novamente.");
      finalizarImportacao();
      return;
    }

    chrome.storage.local.set({
      tempFormData: dados,
    });

    preencherCampoTexto("nome_animal", dados.Nome);
    preencherCampoTexto("registro_animal", dados.Registro);
    preencherCampoTexto("registro2_animal", "");
    preencherCampoTexto("chip_animal", dados.Chip);
    preencherCampoTexto("livro_animal", dados.Livro);
    preencherCampoTexto("pelagem_animal", dados.Pelagem);
    preencherCampoTexto("dna_animal", dados.Exame);

    if (dados.Nascimento) {
      const partes = dados.Nascimento.split("/");
      if (partes.length === 3) {
        preencherCampoTexto(
          "nascimento_animal",
          `${partes[2]}-${partes[1]}-${partes[0]}`
        );
      }
    }

    selecionarSexo("sexo_animal", dados.Sexo);
    selecionarTipoAnimal("tipo_produto_animal", dados.Sexo);
    selecionarRaca("raca_animal", "19"); // 19 = MANGALARGA MARCHADOR
    selecionarDropdown("local_exibicao_animal", "1"); // 1 = VENDA DIRETA
    selecionarDropdown("situacao_site_animal", "1"); // 1 = ATIVO
    selecionarDropdown("destaque_site_animal", "2"); // 2 = NÃO

    // Salvar os dados do formulário após o preenchimento
    setTimeout(() => {
      salvarFormulario(dados);
    }, 2000);
  } catch (error) {
    notificarErro("Ocorreu um erro ao preencher os campos: " + error.message);
    finalizarImportacao();
  }
}

function salvarFormulario(dados) {
  try {
    // Verificar novamente se o modal está aberto
    if (!verificarModalAberto()) {
      notificarErro("O formulário de cadastro foi fechado antes de salvar. Tente novamente.");
      finalizarImportacao();
      return;
    }

    const btnSalvar = document.getElementById("btn_salvar_animal") || document.getElementById("btnSalvarDadosAnimal");

    if (btnSalvar) {
      btnSalvar.click();

      setTimeout(() => {
        // Verificar novamente se o modal ainda está aberto após salvar
        if (verificarModalAberto()) {
          preencherGenealogia(dados);
        } else {
          notificarSucesso("Dados básicos salvos com sucesso! O modal foi fechado automaticamente pelo sistema.");
          finalizarImportacao();
        }
      }, 3000);
    } else {
      notificarErro("Não foi possível encontrar o botão de salvar. Tente salvar manualmente.");
      finalizarImportacao();
    }
  } catch (error) {
    notificarErro("Ocorreu um erro ao salvar o formulário: " + error.message);
    finalizarImportacao();
  }
}

function preencherGenealogia(dados) {
  try {
    // Verificar novamente se o modal está aberto
    if (!verificarModalAberto()) {
      notificarErro("O formulário de cadastro foi fechado antes de preencher a genealogia. Tente novamente.");
      finalizarImportacao();
      return;
    }

    const abaGenealogia = document.getElementById("li_aba_dados_genealogia") || document.getElementById("link_aba_genealogia");

    if (abaGenealogia) {
      // Garantir que a primeira aba da navegação esteja ativa
      const navTabs = document.querySelector(".nav.nav-tabs.bordered");
      if (navTabs) {
        const primeiraAba = navTabs.querySelector("li:first-child");
        if (primeiraAba) {
          primeiraAba.classList.add("active");
        }
      }

      // Agora, clicar na aba de genealogia
      const linkAba = abaGenealogia.querySelector("a");
      if (linkAba) {
        linkAba.click();
      } else {
        abaGenealogia.click();
      }

      setTimeout(() => {
        // Verificar novamente se o modal ainda está aberto
        if (!verificarModalAberto()) {
          notificarErro("O formulário de cadastro foi fechado durante a navegação para genealogia. Tente novamente.");
          finalizarImportacao();
          return;
        }

        preencherCampoTexto("pai", dados.NomePai);
        preencherCampoTexto("mae", dados.NomeMae);
        preencherCampoTexto("avo_pai", dados.NomePaiPai);
        preencherCampoTexto("avoh_pai", dados.NomePaiMae);
        preencherCampoTexto("avo_mae", dados.NomeMaePai);
        preencherCampoTexto("avoh_mae", dados.NomeMaeMae);

        // Preencher bisavós paternos (se disponíveis)
        if (dados.NomePaiPaiPai) {
          preencherCampoTexto("bisavo_pai_avo", dados.NomePaiPaiPai);
        }
        if (dados.NomePaiPaiMae) {
          preencherCampoTexto("bisavoh_pai_avo", dados.NomePaiPaiMae);
        }
        if (dados.NomePaiMaePai) {
          preencherCampoTexto("bisavo_pai_avoh", dados.NomePaiMaePai);
        }
        if (dados.NomePaiMaeMae) {
          preencherCampoTexto("bisavoh_pai_avoh", dados.NomePaiMaeMae);
        }
        if (dados.NomeMaePaiPai) {
          preencherCampoTexto("bisavo_mae_avo", dados.NomeMaePaiPai);
        }
        if (dados.NomeMaePaiMae) {
          preencherCampoTexto("bisavoh_mae_avo", dados.NomeMaePaiMae);
        }
        if (dados.NomeMaeMaePai) {
          preencherCampoTexto("bisavo_mae_avoh", dados.NomeMaeMaePai);
        }
        if (dados.NomeMaeMaeMae) {
          preencherCampoTexto("bisavoh_mae_avoh", dados.NomeMaeMaeMae);
        }

        // Verificar novamente se o modal ainda está aberto
        if (!verificarModalAberto()) {
          notificarErro("O formulário de cadastro foi fechado antes de salvar a genealogia. Tente novamente.");
          finalizarImportacao();
          return;
        }

        // Clicar no botão de salvar novamente após preencher a genealogia
        setTimeout(() => {
          // Verificar primeiro o botão específico de genealogia
          const btnSalvarGenealogia = document.getElementById("btn_salvar_genealogia_animal") || document.getElementById("btnSalvarDadosAnimal");
          const btnSalvarGenerico = document.getElementById("btn_salvar_animal");

          if (btnSalvarGenealogia && verificarModalAberto()) {
            btnSalvarGenealogia.click();

            setTimeout(() => {
              if (verificarModalAberto()) {
                notificarSucesso("Genealogia preenchida e salva com sucesso!");
                fecharModal();
              }
            }, 1500);
          } else if (btnSalvarGenerico && verificarModalAberto()) {
            btnSalvarGenerico.click();

            setTimeout(() => {
              // Verificar se existe o botão específico de genealogia para clicar após salvar
              const btnSalvarFinal = document.getElementById("btn_salvar_genealogia_animal") || document.getElementById("btnSalvarDadosAnimal");
              if (btnSalvarFinal && verificarModalAberto()) {
                btnSalvarFinal.click();

                setTimeout(() => {
                  if (verificarModalAberto()) {
                    notificarSucesso("Genealogia preenchida e salva com sucesso!");
                    fecharModal();
                  }
                }, 1500);
              } else {
                notificarSucesso("Genealogia preenchida e salva com sucesso!");
                fecharModal();
              }
            }, 1000);
          } else if (!verificarModalAberto()) {
            notificarErro("O formulário de cadastro foi fechado antes de salvar a genealogia. Tente novamente.");
            finalizarImportacao();
          } else {
            notificarErro("Não foi possível encontrar o botão de salvar genealogia. Tente salvar manualmente.");
            finalizarImportacao();
          }
        }, 1000);
      }, 1500);
    } else {
      notificarErro("Não foi possível encontrar a aba de genealogia. Tente preencher manualmente.");
      finalizarImportacao();
    }
  } catch (error) {
    notificarErro("Ocorreu um erro ao preencher a genealogia: " + error.message);
    finalizarImportacao();
  }
}

function preencherCampoTexto(id, valor) {
  if (!valor) return;

  const campo = document.getElementById(id);
  if (campo) {
    campo.value = valor;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function selecionarSexo(id, valorSexo) {
  if (!valorSexo) return;

  const select = document.getElementById(id);
  if (!select) {
    return;
  }

  const sexoLower = valorSexo.toLowerCase().trim();
  let valorASelecionar = "";

  if (sexoLower.includes("macho") || sexoLower.includes("garanhão")) {
    valorASelecionar = "MACHO";
  } else if (
    sexoLower.includes("fêmea") ||
    sexoLower.includes("femea") ||
    sexoLower.includes("égua") ||
    sexoLower.includes("egua")
  ) {
    valorASelecionar = "FEMEA";
  } else if (sexoLower.includes("castrado")) {
    valorASelecionar = "CASTRADO";
  } else {
    valorASelecionar = "NÃO INFORMADO";
  }

  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === valorASelecionar) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      break;
    }
  }
}

function selecionarTipoAnimal(id, valorSexo) {
  if (!valorSexo) return;

  const select = document.getElementById(id);
  if (!select) {
    return;
  }

  const sexoLower = valorSexo.toLowerCase().trim();
  let valorASelecionar = "";

  if (sexoLower.includes("macho") || sexoLower.includes("garanhão")) {
    valorASelecionar = "1"; // GARANHÃO
  } else if (
    sexoLower.includes("fêmea") ||
    sexoLower.includes("femea") ||
    sexoLower.includes("égua") ||
    sexoLower.includes("egua")
  ) {
    valorASelecionar = "2"; // ÉGUA
  } else if (sexoLower.includes("castrado")) {
    valorASelecionar = "5"; // CASTRADO
  } else {
    valorASelecionar = "9"; // NÃO ESPECIFICADO
  }

  selecionarDropdown(id, valorASelecionar);
}

function selecionarRaca(id, valor) {
  selecionarDropdown(id, valor);
}

function selecionarDropdown(id, valor) {
  const select = document.getElementById(id);
  if (select) {
    select.value = valor;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function notificarSucesso(mensagem) {
  if (window.Swal) {
    window.Swal.fire({
      icon: "success",
      title: "Importação concluída!",
      text: mensagem,
      confirmButtonText: "OK",
      confirmButtonColor: "#28a745",
    });
  } else if (window.jQuery) {
    const $notificacao = window
      .jQuery("<div>")
      .css({
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#4CAF50",
        color: "white",
        padding: "15px",
        borderRadius: "5px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        zIndex: 9999,
        maxWidth: "80%",
      })
      .html(`<strong>Sucesso!</strong><br>${mensagem}`)
      .appendTo("body");

    setTimeout(() => {
      $notificacao.fadeOut("slow", function () {
        window.jQuery(this).remove();
      });
    }, 5000);
  } else {
    alert(`Sucesso: ${mensagem}`);
  }
}

function notificarErro(mensagem) {
  if (window.Swal) {
    window.Swal.fire({
      icon: "error",
      title: "Erro na importação",
      text: mensagem,
      confirmButtonText: "OK",
      confirmButtonColor: "#dc3545",
    });
  } else if (window.jQuery) {
    const $notificacao = window
      .jQuery("<div>")
      .css({
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#F44336",
        color: "white",
        padding: "15px",
        borderRadius: "5px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        zIndex: 9999,
        maxWidth: "80%",
      })
      .html(`<strong>Erro!</strong><br>${mensagem}`)
      .appendTo("body");

    setTimeout(() => {
      $notificacao.fadeOut("slow", function () {
        window.jQuery(this).remove();
      });
    }, 8000);
  } else {
    alert(`Erro: ${mensagem}`);
  }
}

// Listener para mensagens do background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "importarAnimal" && message.dados) {
    // Verificar novamente se estamos na página de login
    if (window.location.href.includes("/login")) {
      sendResponse({
        success: false,
        message: "Redirecionado para a página de login. Por favor, faça login e tente novamente.",
      });
      return true;
    }

    preencherFormularioAnimal(message.dados);
    sendResponse({ success: true });
    return true;
  }
});

})(); // Fechamento da IIFE