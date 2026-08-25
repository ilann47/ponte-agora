> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[congestionamento]] · [[contagem-veiculos]] · [[clima]] · [[web]] · [[newsletter]]

# Núcleo do Projeto

## Visão geral

Aplicação Python local que lê um stream HLS da BR-277, detecta veículos com YOLO e apresenta um indicador visual de congestionamento no sentido da Ponte da Amizade.

## Arquitetura

- `detector/teste.py`: orquestra stream, inferência e interface OpenCV.
- `detector/congestion_core.py`: concentra regras puras de ROI, ocupação, pontuação e suavização.
- `detector/vehicle_counter.py`: acompanha veículos entre leituras e reconhece a travessia da linha virtual no sentido da Ponte.
- `detector/weather_service.py`: consulta e mantém clima atual e previsão de dois dias.
- `detector/telemetry_publisher.py`: envia métricas autenticadas ao painel web sem bloquear o vídeo.
- `app/`, `db/` e `lib/`: site público, APIs, banco persistente e área administrativa protegida.
- `brain/newsletter.md`: fluxo de assinatura, histórico agregado e entrega diária por e-mail.
- `tests/`: verifica as regras sem abrir câmera, janela ou carregar o modelo.

## Infraestrutura

- Python 3.12.
- OpenCV para captura e desenho.
- Ultralytics YOLO para inferência.
- Open-Meteo para condições e previsão meteorológica.
- Next/Vinext e TypeScript para o painel web hospedado.
- Domínio próprio `filaponte.com.br` com DNS no Registro.br e HTTPS gerenciado pela hospedagem.
- D1 para telemetria atual, contagem horária de veículos e histórico anônimo de visitas.
- Brevo para e-mail transacional e cron-job.org para disparo periódico.
- `unittest` para testes automatizados, sem dependência adicional.

## Padrões globais

- Configurações visíveis no início do executável.
- Coordenadas da ROI normalizadas para funcionar em diferentes resoluções.
- Efeitos externos executados somente por `main()`.
- Métricas calculadas por funções importáveis e testáveis.
- A inferência recebe apenas o recorte da pista e remapeia as caixas para o frame completo.
- Um worker executa YOLO fora do loop de exibição, mantendo no máximo uma inferência ativa e nenhum frame pendente.
- Outro worker atualiza o clima sem compartilhar o caminho crítico do vídeo.
- O frame é reduzido para 1100×650 antes dos efeitos visuais; painel, ROI e caixas são desenhados nessa resolução para manter texto nítido e reduzir o custo por quadro.
- O painel calcula sua escala a partir da janela e limita sua borda inferior antes do início da ROI.
- O loop respeita o ritmo original de 25 FPS, mesmo quando consegue consumir o buffer HLS mais rapidamente.
- Um publicador de telemetria com worker único envia somente a leitura mais recente a cada segundo, incluindo ROI e caixas normalizadas.
- O site reproduz o HLS diretamente; o detector local não retransmite frames.
- O navegador desenha a camada da IA em canvas transparente sobre o vídeo original.
- O detector Python não ganhou dependências; telemetria e testes continuam usando a biblioteca padrão.
- O site renderiza a última telemetria disponível no HTML inicial e continua a atualização no navegador a cada dois segundos.
- A atualização web pausa em abas ocultas para evitar consultas desnecessárias e retoma ao voltar para a página.
- O clima web é consultado diretamente da Open-Meteo pelo navegador; a rota local apenas redireciona e não consome a API externa pelo Worker hospedado.
- As navegações web simples usam âncoras HTML para evitar o erro de prefetch RSC da versão atual do Vinext.
- Indicadores animados do painel usam transformações compostas quando possível, evitando animação de propriedades de layout.
- A newsletter confirma a posse do e-mail, usa links HMAC sem token persistido e remove a PII no cancelamento.
- O histórico de trânsito mantém somente uma amostra por janela de cinco minutos.
- O contador de passagens mantém uma sessão única por execução do detector e publica apenas o total acumulado; o servidor persiste somente o incremento novo.

## Módulos relacionados

- [[congestionamento]]
- [[contagem-veiculos]]
- [[clima]]
- [[web]]
- [[newsletter]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-23 | Criada a documentação viva inicial antes da refatoração do detector. |
| 2026-08-23 | Separado o núcleo testável e removidos os efeitos colaterais de importação do executável. |
| 2026-08-23 | Otimizada a inferência com recorte da pista, preservando a exibição no frame completo. |
| 2026-08-23 | Separados o vídeo e a inferência para recuperar a taxa nativa de exibição. |
| 2026-08-23 | Integrados clima atual e previsão de dois dias ao painel. |
| 2026-08-23 | Ampliado o painel de forma responsiva e movidos os efeitos visuais para a resolução da janela. |
| 2026-08-23 | Limitada a reprodução a 25 FPS para impedir aceleração dos veículos ao consumir frames armazenados. |
| 2026-08-23 | Iniciada a versão web com vídeo HLS, telemetria e histórico privado de acessos. |
| 2026-08-23 | Publicado o Ponte Agora e conectada a telemetria assíncrona do detector ao site. |
| 2026-08-23 | Restaurados ROI, classes e probabilidades no player web sem recodificar o HLS. |
| 2026-08-23 | Tornado o estado inicial rastreável por buscadores e reduzidas consultas web em abas inativas. |
| 2026-08-23 | Retirada a consulta meteorológica do Worker hospedado para eliminar respostas `503` no painel web. |
| 2026-08-23 | Publicada a versão 4 com o fluxo meteorológico corrigido e validado no endereço público. |
| 2026-08-23 | Corrigidos o erro de prefetch RSC e a animação não composta apontados pelo Lighthouse. |
| 2026-08-24 | Publicada e verificada a versão 5 com os ajustes corrigíveis da auditoria Lighthouse. |
| 2026-08-24 | Integrada a newsletter diária com histórico agregado, previsão e gestão por link seguro. |
| 2026-08-24 | Adicionada contagem única de passagens no sentido da Ponte e histórico diário público. |
| 2026-08-24 | Reunidos site, detector, testes e documentação em um único repositório. |
| 2026-08-24 | Publicado o repositório privado no GitHub com o remoto do Sites preservado. |
| 2026-08-24 | Ativado o domínio `filaponte.com.br` com DNS, validações e certificado HTTPS. |
| 2026-08-24 | Tornado `filaponte.com.br` a origem canônica única para indexação e links públicos. |
