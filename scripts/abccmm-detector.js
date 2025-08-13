/**
 * ABCCMM Detector - Importador AgroBold
 * Detecta quando o usuário está numa página de animal da ABCCMM
 * e automaticamente abre o popup de login se necessário
 */

// Proteção contra conflitos com frameworks do servidor
(function () {
  "use strict";

  // Verificar se estamos na URL específica da ABCCMM
  const currentUrl = window.location.href;

  // Lista de URLs que NÃO devem executar o script
  const urlsExcluidas = [
    "/principais",
    "/criadores",
    "/eventos",
    "/ranking",
    "/comunicacao",
    "/projetos",
    "/cursos",
    "/sistema",
    "/fale-conosco",
    "/seja-socio",
    "/parque-da-gameleira",
  ];

  // Verificar se está em uma URL excluída
  const isUrlExcluida = urlsExcluidas.some((path) => currentUrl.includes(path));
  if (isUrlExcluida) {
    return;
  }

  // Verificar se é página de animais
  const isAnimaisPage =
    currentUrl.includes("/animais") && currentUrl.includes("abccmm.org.br");

  if (!isAnimaisPage) {
    return;
  }

  // Listener para mensagens do popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "redetectarDados") {
      const dadosAnimal = extrairDadosAnimal();
      if ((dadosAnimal.Nome && dadosAnimal.Nome.trim() !== '') || 
          (dadosAnimal.Registro && dadosAnimal.Registro.trim() !== '')) {
        // Salvar dados atualizados
        chrome.storage.local.set({
          dadosDetectados: dadosAnimal,
        });
        sendResponse({ success: true, dados: dadosAnimal });
      } else {
        sendResponse({ success: false, message: "Nenhum dado detectado" });
      }
      return true; // Manter o canal aberto para resposta assíncrona
    }

    if (message.action === "forcarDeteccao") {
      // Forçar nova detecção de dados na página atual

      // Verificar se estamos numa página de animal
      if (isPaginaAnimal()) {
        const dadosAnimal = extrairDadosAnimal();

        if ((dadosAnimal.Nome && dadosAnimal.Nome.trim() !== '') || 
            (dadosAnimal.Registro && dadosAnimal.Registro.trim() !== '')) {

          // Salvar os dados detectados
          chrome.storage.local.set({
            dadosDetectados: dadosAnimal,
          });

          // Notificar o background script
          chrome.runtime.sendMessage({
            action: "dadosDetectados",
            dados: dadosAnimal,
          });

          sendResponse({ success: true, dados: dadosAnimal });
        } else {
          sendResponse({
            success: false,
            message: "Nenhum dado detectado na página",
          });
        }
      } else {
        sendResponse({ success: false, message: "Não é uma página de animal" });
      }

      return true;
    }
  });

  // Função para verificar se estamos numa página de animal
  function isPaginaAnimal() {
    // Verificar pela URL específica
    const url = window.location.href;

    // Verificar se é exatamente a página de animais da ABCCMM (com ou sem www)
    const isUrlAnimaisABCCMM =
      url.includes("/animais") &&
      (url.includes("www.abccmm.org.br") || url.includes("abccmm.org.br"));

    // Excluir páginas que não são de animais específicos
    const isPaginaInvalida =
      url.includes("/principais") ||
      url.includes("/criadores") ||
      url.includes("/eventos") ||
      url.includes("/ranking") ||
      url.includes("/comunicacao") ||
      url.includes("/projetos") ||
      url.includes("/cursos");

    if (isUrlAnimaisABCCMM && !isPaginaInvalida) {
      return true;
    }

    return false;
  }

  // Função para extrair dados do animal da página
  function extrairDadosAnimal() {
    const dados = {};

    // Tentar extrair dados comuns de páginas de animais
    try {
      // Nome do animal - verificação primária
      const elemento = document.querySelector(
        "#ContentPlaceHolder1_LblNomeAnimal"
      );
      
      // Se o elemento principal não existe, verificar se já temos dados válidos salvos
      if (!elemento || !elemento.textContent.trim()) {
        // Verificar se já existem dados válidos salvos
        const dadosSalvos = JSON.parse(sessionStorage.getItem('agrobold-dados-detectados') || '{}');
        
        // Só limpar se realmente não há dados válidos e não estamos numa página de animal
        if (!dadosSalvos.Nome && !dadosSalvos.Registro) {
          // Limpar dados anteriores do sessionStorage e localStorage
          sessionStorage.removeItem('agrobold-dados-detectados');
          chrome.storage.local.remove('dadosDetectados');
          
          // Notificar que não há dados apenas se realmente não estamos numa página de animal
          if (!isPaginaAnimal()) {
            chrome.runtime.sendMessage({
              action: "naoHaDados"
            }).catch((err) => {
              // Ignorar erro se background não estiver disponível
            });
          }
        }
        
        return dadosSalvos || {}; // Retornar dados salvos ou objeto vazio
      }
      
      // Se chegou até aqui, há um animal detectado
      dados.Nome = elemento.textContent.trim();
      // Registro
      const elementoRegistro = document.querySelector(
        "#ContentPlaceHolder1_LblRegistro"
      );
      if (elementoRegistro && elementoRegistro.textContent.trim()) {
        dados.Registro = elementoRegistro.textContent.trim();
      }
      // Sexo
      const elementoSexo = document.querySelector(
        "#ContentPlaceHolder1_LblSexo"
      );
      if (elementoSexo && elementoSexo.textContent.trim()) {
        dados.Sexo = elementoSexo.textContent.trim();
      }
      // Nascimento
      const elementoNascimento = document.querySelector(
        "#ContentPlaceHolder1_LblDataNascimento"
      );
      if (elementoNascimento && elementoNascimento.textContent.trim()) {
        dados.Nascimento = elementoNascimento.textContent.trim();
      }

      // Pelagem
      const elementoPelagem = document.querySelector(
        "#ContentPlaceHolder1_LblPelagem"
      );
      if (elementoPelagem && elementoPelagem.textContent.trim()) {
        dados.Pelagem = elementoPelagem.textContent.trim();
      }
      // Criador
      const elementoCriador = document.querySelector(
        "#ContentPlaceHolder1_LblCriador"
      );
      if (elementoCriador && elementoCriador.textContent.trim()) {
        dados.Criador = elementoCriador.textContent.trim();
      }
      // Proprietario
      const elementoProprietario = document.querySelector(
        "#ContentPlaceHolder1_LblProprietario"
      );
      if (elementoProprietario && elementoProprietario.textContent.trim()) {
        dados.Proprietario = elementoProprietario.textContent.trim();
      }
      //Livro
      const elementoLivro = document.querySelector(
        "#ContentPlaceHolder1_LblLivro"
      );
      if (elementoLivro && elementoLivro.textContent.trim()) {
        dados.Livro = elementoLivro.textContent.trim();
      }
      //Chip
      const elementoChip = document.querySelector(
        "#ContentPlaceHolder1_LblChip"
      );
      if (elementoChip && elementoChip.textContent.trim()) {
        dados.Chip = elementoChip.textContent.trim();
      }
      //exame
      const elementoExame = document.querySelector(
        "#ContentPlaceHolder1_LblExame"
      );
      if (elementoExame && elementoExame.textContent.trim()) {
        dados.Exame = elementoExame.textContent.trim();
      }
      // Vivo
      const elementoVivo = document.querySelector(
        "#ContentPlaceHolder1_LblVivo"
      );
      if (elementoVivo && elementoVivo.textContent.trim()) {
        dados.Vivo = elementoVivo.textContent.trim();
      }
      //bloqueado
      const elementoBloqueado = document.querySelector(
        "#ContentPlaceHolder1_LblBloqueado"
      );
      if (elementoBloqueado && elementoBloqueado.textContent.trim()) {
        dados.Bloqueado = elementoBloqueado.textContent.trim();
      }

      // genealogia
      // pai
      const elementoPai = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePai_Genealogia"
      );
      if (elementoPai && elementoPai.textContent.trim()) {
        dados.pai = elementoPai.textContent.trim();
      }

      // avô por pai
      const elementop01 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiPai_Genealogia"
      );
      if (elementop01 && elementop01.textContent.trim()) {
        dados.p01 = elementop01.textContent.trim();
      }

      const elementop02 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiMae_Genealogia"
      );
      if (elementop02 && elementop02.textContent.trim()) {
        dados.p02 = elementop02.textContent.trim();
      }

      // avó por pai
      const elementop03 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiPaiPai_Genealogia"
      );
      if (elementop03 && elementop03.textContent.trim()) {
        dados.p03 = elementop03.textContent.trim();
      }

      // bisavô por pai
      const elementop04 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiPaiMae_Genealogia"
      );
      if (elementop04 && elementop04.textContent.trim()) {
        dados.p04 = elementop04.textContent.trim();
      }

      // bisavó por pai
      const elementop05 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiMaePai_Genealogia"
      );
      if (elementop05 && elementop05.textContent.trim()) {
        dados.p05 = elementop05.textContent.trim();
      }

      const elementop06 = document.querySelector(
        "#ContentPlaceHolder1_lblPai_NomePaiMaeMae_Genealogia"
      );
      if (elementop06 && elementop06.textContent.trim()) {
        dados.p06 = elementop06.textContent.trim();
      }

      // mae
      const elementoMae = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMae_Genealogia"
      );
      if (elementoMae && elementoMae.textContent.trim()) {
        dados.Mae = elementoMae.textContent.trim();
      }

      // avô por mãe
      const elementom01 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomePaiMae_Genealogia"
      );
      if (elementom01 && elementom01.textContent.trim()) {
        dados.m01 = elementom01.textContent.trim();
      }

      const elementom02 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMaeMae_Genealogia"
      );
      if (elementom02 && elementom02.textContent.trim()) {
        dados.m02 = elementom02.textContent.trim();
      }

      // avó por mãe
      const elementom03 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMaePaiPai_Genealogia"
      );
      if (elementom03 && elementom03.textContent.trim()) {
        dados.m03 = elementom03.textContent.trim();
      }

      // bisavô por mãe
      const elementom04 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMaePaiMae_Genealogia"
      );
      if (elementom04 && elementom04.textContent.trim()) {
        dados.m04 = elementom04.textContent.trim();
      }
      // bisavó por mãe
      const elementom05 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMaeMaePai_Genealogia"
      );
      if (elementom05 && elementom05.textContent.trim()) {
        dados.m05 = elementom05.textContent.trim();
      }
      const elementom06 = document.querySelector(
        "#ContentPlaceHolder1_lblMae_NomeMaeMaeMae_Genealogia"
      );
      if (elementom06 && elementom06.textContent.trim()) {
        dados.m06 = elementom06.textContent.trim();
      }

    } catch (error) {
      // Ignorar erros de extração
    }

    return dados;
  }

  // Função para verificar se está logado no sistema
  function verificarStatusLogin() {
    return new Promise((resolve) => {
      chrome.storage.local.get("token", function (result) {
        resolve(!!result.token);
      });
    });
  }

  // Função principal para detectar e agir
  async function detectarEProcessar() {
    if (isPaginaAnimal()) {
      const estaLogado = await verificarStatusLogin();

      // Sempre extrair dados quando estiver numa página de animal
      const dadosAnimal = extrairDadosAnimal();

      if ((dadosAnimal.Nome && dadosAnimal.Nome.trim() !== '') || 
          (dadosAnimal.Registro && dadosAnimal.Registro.trim() !== '')) {
        // Salvar dados para importação posterior
        chrome.storage.local.set({
          dadosDetectados: dadosAnimal,
        });

        // Notificar background script
        chrome.runtime
          .sendMessage({
            action: "dadosDetectados",
            dados: dadosAnimal,
          })
          .catch((err) => {
            // Ignorar erro se background não estiver disponível
          });

        if (estaLogado) {
          // Verificar se usuário está logado para mostrar modal automaticamente
          chrome.storage.local.get(["token", "harasInfo"], function (result) {
            if (result.token) {
              // Usuário logado, mostrar modal lateral automaticamente
              chrome.runtime
                .sendMessage({
                  action: "mostrarModalLateral",
                  dados: dadosAnimal,
                  userInfo: result.harasInfo,
                })
                .catch((err) => {
                  // Se falhar via background, tentar diretamente
                  setTimeout(() => {
                    window.postMessage(
                      {
                        type: "AGROBOLD_MOSTRAR_MODAL",
                        dados: dadosAnimal,
                        userInfo: result.harasInfo,
                      },
                      "*"
                    );
                  }, 1000);
                });
            }
          });
        }
      }
    }
  }

  // Executar quando a página carregar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detectarEProcessar);
  } else {
    detectarEProcessar();
  }

  // Também executar após um tempo para páginas que carregam dinamicamente
  setTimeout(detectarEProcessar, 2000);
  setTimeout(detectarEProcessar, 5000);
})(); // Fechamento da IIFE
