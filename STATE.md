> Links: [[PROJECT]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]]

# Estado do Projeto

**Última atualização:** 2026-08-26
**Fase atual:** consulta gratuita do tempo de travessia em validação antes da publicação

## O que foi feito

- Adicionado cartão de tempo de travessia com rota pronta da aduana brasileira à paraguaia no Google Maps, sem chave, cobrança ou configuração externa.
- Mantida a duração dentro do Google Maps para respeitar a alternativa oficial gratuita e preservar o desempenho da câmera, da ROI e da IA.

- Refatorado `teste.py` para eliminar efeitos colaterais na importação e organizar o loop em `main()`.
- Criado `congestion_core.py` com ROI, ocupação, score e suavização testáveis.
- Recortada a pista antes da inferência, usando 640 px sem perder a detecção de veículos pequenos.
- Substituída a ROI horizontal por um polígono normalizado da pista no sentido Ponte.
- Corrigida a ocupação para usar a união das caixas, sem dupla contagem.
- Modernizado o painel com cores por nível, FPS, ajuda e reset da média.
- Criados 29 testes automatizados do detector e a documentação viva em [[brain/core]], [[brain/congestionamento]], [[brain/clima]] e [[brain/web]].
- Validados compilação, testes, imagem fornecida e benchmark de 10 frames no stream HLS atual.
- Reduzido o tempo médio de inferência de 260,0 ms para 107,4 ms, ganho aproximado de 2,4 vezes.
- Separados o vídeo e o YOLO com um worker sem fila, mantendo o último resultado disponível.
- Recuperada a exibição do stream para 24,7 FPS, próxima dos 25 FPS nativos, enquanto a IA atualiza a 8,4 FPS.
- Atualizado o painel para mostrar FPS do vídeo e da IA separadamente.
- Adicionados clima atual e previsões de hoje e amanhã usando Open-Meteo.
- Criado `weather_service.py` com atualização em segundo plano, cache e nova tentativa automática.
- Validado o pipeline completo em 24,6 FPS de vídeo e 6,9 FPS de IA, com clima carregado sem erro.
- Ampliados título, situação, clima, métricas e rodapé do painel de forma proporcional à resolução.
- Divididos temperatura/sensação e chuva/vento em duas linhas para evitar texto apertado.
- Limitada automaticamente a borda inferior do painel antes da ROI; na janela 1100×650, o painel termina em `y=211` e a ROI começa em `y=227`.
- Movidos ROI, caixas e painel para o frame de exibição 1100×650, reduzindo o custo dos efeitos visuais.
- Identificado que o pipeline visual conseguia consumir o buffer a 35,1 FPS, acelerando artificialmente os veículos.
- Adicionado controle de ritmo em 25 FPS sem alterar o painel ampliado; stream verificado com 100 frames em 4,04 s, equivalentes a 24,72 FPS.
- Criado o site público Ponte Agora com HLS ao vivo, trânsito, clima atual e previsão de hoje e amanhã.
- Integrada telemetria assíncrona de `teste.py` para o site, sem fila e sem bloquear vídeo ou inferência.
- Criado histórico persistente de visitas com totais, visitantes únicos, origens, países, dispositivos e acessos recentes.
- Protegida a área `/admin` com login e lista exclusiva do proprietário; o restante do site permanece público.
- Removido o armazenamento de IP bruto; os identificadores são hashes diários e os eventos expiram após 180 dias.
- Publicado `https://ponte-agora.ilanwendling.chatgpt.site` e configurada automaticamente a conexão local para novas execuções do detector.
- Aprovados 14 testes web, lint, build de produção, auditoria sem vulnerabilidades de produção e testes HTTP das rotas publicadas.
- Ampliada a telemetria com ROI normalizada, caixas, classes e confiança das detecções, limitada a uma atualização por segundo e sem fila.
- Restaurada no site a camada visual da IA sobre o HLS original: ROI magenta, caixas verdes e probabilidades em porcentagem.
- Centralizada a consulta de trânsito do navegador para alimentar ao mesmo tempo o overlay e o painel de métricas.
- Adicionada migração persistente para o estado mais recente do overlay, sem criar histórico de imagens ou detecções.
- Publicada a versão atualizada no mesmo endereço e reiniciado o detector local com o novo código.
- Validado o detector real em produção com 3 carros, vídeo a 24,6 FPS e IA a 15,6 FPS.
- Aprovados 17 testes web, 29 testes Python, lint, build e teste ponta a ponta da telemetria com overlay.
- Corrigida a interpretação das estatísticas: o painel próprio conta páginas abertas por pessoas, enquanto as visualizações nativas da hospedagem também incluem chamadas automáticas de API.
- Adicionados `robots.txt`, `sitemap.xml`, canonical, regras de indexação, dados estruturados e suporte opcional à verificação do Google Search Console.
- Reposicionada a página para a busca “fila da Ponte da Amizade agora”, preservando câmera, ROI, caixas, probabilidades, trânsito e clima.
- Criadas seções públicas de utilidade, dúvidas frequentes e uma página de metodologia com fontes, funcionamento e limitações da IA.
- Passada a última telemetria para o HTML inicial, permitindo que buscadores entendam o estado do monitor antes do JavaScript.
- Ajustada a consulta do trânsito para dois segundos, sem sobreposição e com pausa quando a aba está oculta.
- Protegidas da indexação as áreas administrativa e de privacidade; rotas de API ficaram fora do sitemap.
- Aprovados 21 testes web, lint, build e verificações locais de HTTP, sitemap, robots, canonical, JSON-LD e conteúdo rastreável.
- Identificada a falha de `/admin`: o identificador encaminhado pelo login do ChatGPT é específico do Site e não deve depender apenas do identificador global da política de acesso.
- Autorizada também a conta proprietária pelo e-mail confirmado, mantendo o histórico privado e restrito.
- Publicada a versão 3 e verificados em produção a página inicial, `robots.txt`, `sitemap.xml`, `/como-funciona` e o redirecionamento de `/admin` para o login do ChatGPT.
- Reproduzida em produção a falha `503` de `/api/weather`; a Open-Meteo respondeu `200` para a mesma consulta fora do Worker hospedado.
- Alterado o clima web para consultar a fonte pública diretamente no navegador, com nova tentativa em 1 minuto após falha e atualização normal a cada 10 minutos.
- Transformada `/api/weather` em redirecionamento `307`, preservando compatibilidade sem executar a chamada externa pelo servidor.
- Aprovados 23 testes web, lint, build, rota local com redirecionamento e consulta real do clima atual, hoje e amanhã.
- Confirmado que o Google ainda não indexou o domínio, embora Googlebot receba `200`, `index, follow`, canonical, `robots.txt` liberado e sitemap válido.
- Publicada a versão 4 e verificado em produção o fluxo completo do clima: página `200`, redirecionamento `307`, resposta Open-Meteo `200`, CORS liberado e dados válidos de agora, hoje e amanhã.
- Analisado o Lighthouse: o erro de console vinha do prefetch RSC do `next/link`; os avisos de APIs obsoletas pertencem ao script da hospedagem e os cookies/6,7 MB pertencem ao HLS externo.
- Substituída a navegação interna simples por âncoras HTML, eliminando o chunk `next/link` que originava o erro de console.
- Trocada a animação de largura da barra de trânsito por `transform: scaleX()`, removendo a animação não composta apontada no relatório.
- Aprovados 25 testes web, lint e build; confirmado que o bundle cliente não contém mais um chunk `next/link`.
- Publicada a versão 5 e verificados em produção: página `200`, trânsito `200`, clima `307`, transformação composta presente e ausência do chunk `next/link` problemático.
- Implementada newsletter diária com e-mail, escolha de hora no fuso de Foz, confirmação da inscrição e página privada de preferências.
- Adicionados alteração de horário, cancelamento com remoção do e-mail, limite antiabuso e links HMAC sem token persistido.
- Criado histórico agregado do trânsito em janelas de cinco minutos e resumo diário com média, pico e evolução por hora.
- Integrados clima atual, previsão de hoje e amanhã, situação do trânsito no envio e histórico do dia ao conteúdo HTML e texto simples da mensagem.
- Criado disparo protegido e idempotente, com nova tentativa controlada, lotes pequenos e limite de 250 assinantes ativos.
- Adicionadas tabelas D1, bootstrap compatível e migração `0002_peaceful_lilith.sql` para assinaturas, envios, limites e amostras.
- Atualizada a página de privacidade com finalidade, confirmação, retenções de 2/7/31 dias e remoção da PII no cancelamento.
- Validada a interface local sem sobrepor a câmera ou a ROI; o erro de hot reload do Vinext desapareceu após reinício limpo.
- Aprovados 46 testes web, TypeScript, lint, build de produção e validação do canvas da documentação.
- Criado rastreamento leve de veículos por ponto de contato, com linha virtual e contagem única somente no sentido da Ponte.
- Adicionados UUID por execução e total acumulado à telemetria, sem alterar o vídeo a 25 FPS, a ROI, as caixas ou as probabilidades.
- Criadas persistência idempotente por hora, agregação diária e migração `0003_right_spitfire.sql`.
- Adicionada rota pública de histórico para 7/30 dias e gráfico abaixo da câmera com hoje, total, média e pico horário.
- Aprovados 34 testes Python e 55 testes web, além de compilação Python, TypeScript, lint e build de produção.
- Protegida a publicação do gráfico: a interface da newsletter permanece oculta enquanto as credenciais externas não estiverem configuradas.
- Publicada a versão 6 no endereço público com a migração da contagem aplicada.
- Renovada a chave privada entre detector e site sem expor o valor, e reiniciado somente o processo `teste.py`.
- Verificados em produção página e histórico com resposta `200`, detector online único e a primeira passagem registrada no total de hoje.
- Reunidos site, detector, modelo, testes e documentação na pasta única `ponte-agora/`, preservando o histórico Git e a configuração do Sites.
- Criado e enviado o repositório privado `ilann47/ponte-agora` com branch principal `main`.
- Mantidos dois remotos explícitos: `origin` para GitHub e `sites` para a hospedagem pública existente.
- Reescritos os 18 commits existentes para atribuir autoria e responsabilidade à conta GitHub `ilann47`, preservando integralmente arquivos, mensagens e datas.
- Configurada no repositório a identidade privada `ILAN WENDLING THOELE <41265766+ilann47@users.noreply.github.com>` para os próximos commits.
- Ativado `filaponte.com.br` com os dois registros A, as verificações TXT e certificado HTTPS válido.
- Confirmada resposta `200` do domínio próprio nos dois endereços de borda da hospedagem.
- Corrigidos canonical, Open Graph, `robots.txt`, sitemap e links gerados para usar somente `https://filaponte.com.br`.
- Tratado o endereço `chatgpt.site` como origem legada, evitando que uma configuração antiga volte a marcar o domínio próprio como duplicado.
- Validada a correção com 55 testes web, TypeScript, lint, build e inspeção HTTP local dos metadados.
- Atualizada na hospedagem a variável pública `SITE_URL` para `https://filaponte.com.br`.
- Publicada a versão 7 e confirmados em produção canonical, Open Graph, `robots.txt` e sitemap sem nenhuma referência ao endereço antigo.
- Confirmado que até o endereço técnico `chatgpt.site` declara `https://filaponte.com.br` como canonical.
- Confirmada a propriedade de domínio `filaponte.com.br` no Google Search Console por registro TXT público.
- Validado em produção que `robots.txt` responde `200`, libera as páginas públicas e referencia o sitemap canônico; `sitemap.xml` responde `200` com as páginas públicas do domínio próprio.
- Diagnosticada a indisponibilidade da IA como divergência entre a credencial local do detector e a credencial de telemetria aceita pela hospedagem, que respondia `401` às publicações.
- Renovada e sincronizada a credencial de telemetria entre a hospedagem e o ambiente local, mantendo o valor exclusivamente como segredo.
- Republicada a configuração da versão 7 com a revisão 6 do ambiente e reiniciado o detector local.
- Confirmada em produção a recuperação da IA com estado online, 14 detecções, vídeo a 25 FPS e inferência a aproximadamente 11,8 FPS.

## Decisões tomadas

- **Recorte da pista em 640 px:** mantém os veículos grandes para o modelo e evita processar áreas irrelevantes do frame.
- **Confiança 0,20 e IoU 0,40:** aumentam a sensibilidade e removem caixas duplicadas.
- **ROI pela base da caixa:** aproxima a posição real do veículo sobre a pista.
- **Média exponencial:** reage mais rápido que a média móvel longa do código original.
- **Núcleo separado:** permite testar as regras sem câmera, janela ou carga do YOLO.
- **Worker único sem fila:** impede atraso acumulado e não bloqueia a exibição enquanto o YOLO processa.
- **Resultados reaproveitados:** as caixas podem ficar cerca de 100–120 ms atrás do vídeo, mantendo a tela fluida.
- **Open-Meteo sem chave:** evita credenciais e novas despesas para os dados meteorológicos.
- **Clima fora do loop:** atualização a cada 10 minutos sem afetar vídeo ou IA.
- **Painel responsivo:** fontes e espaçamentos crescem juntos, com limite vertical calculado a partir do topo da ROI.
- **Desenho na resolução da janela:** mantém a leitura nítida e evita aplicar transparências no frame 2560×1440.
- **Ritmo fixo de 25 FPS:** impede reprodução acelerada e desconta da espera o tempo já gasto com captura, IA e desenho.
- **HLS direto no navegador:** preserva a velocidade real da câmera e evita retransmitir o vídeo pelo computador local.
- **YOLO permanece local:** o site recebe apenas métricas autenticadas, reduzindo custo e mantendo o processamento existente.
- **Site público e histórico privado:** visitantes veem câmera, trânsito e clima; somente o proprietário autenticado acessa as estatísticas.
- **Analytics com privacidade:** IP não é persistido e a retenção é limitada a 180 dias.
- **Overlay por coordenadas normalizadas:** ROI e caixas acompanham qualquer tamanho de tela sem alterar o vídeo.
- **Canvas transparente:** desenha probabilidades no navegador sem recodificar ou acelerar o HLS.
- **Telemetria a 1 Hz:** equilibra atualização visual e quantidade de gravações no banco.
- **SEO orientado à intenção local:** título, H1 e conteúdo priorizam a consulta “fila da Ponte da Amizade agora”, diferenciando o painel pela análise por IA.
- **Metodologia separada:** uma página pública concentra transparência e conteúdo original sem sobrecarregar a câmera ao vivo.
- **Métricas humanas próprias:** o histórico privado é a referência de visitantes; requisições automáticas da hospedagem não são tratadas como pessoas.
- **Busca a cada 2 segundos e somente com a aba visível:** mantém a leitura atual sem inflar desnecessariamente as chamadas de API.
- **Admin por e-mail confirmado e identificador:** evita incompatibilidade entre o ID global da conta e o ID específico encaminhado pelo login de cada Site.
- **Clima direto no navegador:** evita o limite compartilhado da saída do Worker hospedado sem expor chave, pois a Open-Meteo é pública e permite CORS.
- **Indexação assistida pelo Search Console:** o código está rastreável, mas descoberta e indexação dependem do Google e devem ser solicitadas pela conta proprietária.
- **Navegação completa temporária:** pequenas trocas de página usam âncoras HTML até a correção do prefetch RSC no Vinext; a confiabilidade do console vale mais que a transição client-side nessas poucas rotas.
- **Stream preservado na origem:** cookies e tamanho dos segmentos pertencem ao fornecedor do vídeo; retransmitir 6–7 MB por visita aumentaria banda, custo e risco operacional.
- **Newsletter com dupla confirmação:** nenhum resumo diário começa antes de o dono do endereço abrir o link recebido.
- **Links HMAC sem token persistido:** a gestão usa identificador e versão assinados por segredo do servidor.
- **Histórico em cinco minutos:** 288 amostras máximas por dia preservam a tendência sem gravar cada atualização do detector.
- **Limite de 250 assinantes:** reserva parte da cota gratuita de 300 envios diários da Brevo para confirmação e gestão.
- **Cancelamento remove PII:** a assinatura e o e-mail são apagados; logs operacionais sem e-mail permanecem somente pelo prazo curto.
- **Linha virtual sem sobreposição:** a linha usada na lógica não é desenhada; o ROI, as caixas e as probabilidades existentes permanecem intactos.
- **Passagem única por sessão:** o detector envia um total acumulado e o servidor soma somente o delta, evitando contar novamente uma atualização repetida.
- **Histórico horário e visão diária:** a granularidade do banco permite calcular o pico do dia, enquanto o gráfico público mantém leitura simples em 7/30 dias.
- **Renovação coordenada da telemetria:** a chave do Site e a do novo processo foram trocadas juntas; o detector antigo foi encerrado somente após a primeira gravação válida.
- **Autoria GitHub com endereço privado:** os commits usam o endereço `noreply` associado à conta `ilann47`, garantindo atribuição ao proprietário sem publicar o e-mail pessoal.
- **Domínio próprio com fallback:** `filaponte.com.br` é o endereço público principal; o endereço `chatgpt.site` permanece disponível durante a transição da URL canônica.
- **Canonical único:** mesmo que uma variável hospedada ainda contenha o endereço antigo, metadados e links públicos convertem essa origem para `https://filaponte.com.br`.
- **Rotação coordenada da telemetria:** a credencial hospedada e a configuração local devem ser atualizadas juntas e validadas por autenticação antes de reiniciar o detector, evitando um processo ativo que tenha suas leituras rejeitadas.
- **Rota pública do Google Maps:** oferece a duração atual da travessia sem chave nem cobrança; o valor permanece dentro do Maps porque a opção gratuita não fornece o tempo para o painel próprio.

## Próximos passos

1. Publicar o cartão de tempo de travessia após a aprovação do proprietário.
2. Acompanhar as primeiras horas da contagem e comparar uma amostra manual para calibrar a linha virtual se necessário.
3. Acompanhar no Google Search Console o processamento do sitemap e solicitar a indexação das páginas públicas.
4. Criar ou acessar a conta Brevo, ativar o envio transacional e verificar o endereço remetente.
5. Configurar os segredos da newsletter, agendar o disparo e validar uma assinatura real de ponta a ponta.
6. Coletar exemplos rotulados de pista livre, moderada e congestionada para recalibrar os limites heurísticos e auditar a contagem.

## Bloqueios / Dívidas técnicas

- O score ainda depende de calibração heurística; não há conjunto rotulado que prove a correspondência com o congestionamento real.
- A previsão é produzida por modelo meteorológico e pode divergir da condição observada localmente.
- O HLS do navegador e o detector são consumidores independentes; pode existir pequeno deslocamento temporal entre veículo e caixa.
- A pasta residual `web/` ficou vazia após a movimentação; a remoção automática foi bloqueada pela proteção local, sem deixar código ou dados duplicados.
- O cadastro no Google Search Console depende de uma confirmação manual na conta Google; o código já aceita o token de verificação quando ele for fornecido.
- O Search Console abriu autenticado na conta proprietária, mas o controle automático do Chrome não conseguiu acionar os controles da página; adicionar a propriedade, enviar o sitemap e solicitar a indexação permanecem como ações manuais.
- A indexação e a posição nos resultados não podem ser forçadas pelo site; o Google informa que um novo rastreamento pode levar de alguns dias a algumas semanas.
- Os avisos Lighthouse sobre Shared Storage, Protected Audience e `StorageType.persistent` vêm do script `main.js` administrado pela hospedagem, não do código do projeto.
- Os avisos de cookie e o volume dos segmentos de vídeo vêm de `video02.logicahost.com.br` e não podem ser corrigidos sem controle do fornecedor ou retransmissão do HLS.
- A hospedagem ainda não possui `BREVO_API_KEY`, `NEWSLETTER_FROM_EMAIL`, `NEWSLETTER_FROM_NAME`, `NEWSLETTER_TOKEN_SECRET` ou `NEWSLETTER_CRON_SECRET`; o formulário agora fica automaticamente oculto até a configuração.
- A ativação da Brevo exige uma conta externa, uma chave privada e a verificação do remetente; esses passos dependem do proprietário.
- A criação do agendamento externo depende de uma conta no cron-job.org depois que a rota estiver publicada.
- O histórico de veículos começa vazio e depende de o detector atualizado permanecer ligado; a precisão deverá ser auditada com amostras de vídeo reais.
