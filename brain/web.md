> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[congestionamento]] · [[contagem-veiculos]] · [[clima]] · [[newsletter]] · [[cameras]]

# Painel Web

## Objetivo

Disponibilizar o monitor da Ponte da Amizade no navegador, com nove câmeras da fronteira, indicadores de congestionamento, clima, newsletter diária, conteúdo indexável para buscas e uma área administrativa privada para o histórico de acessos reais.

## Contexto

O stream HLS da Aduana permite acesso direto pelo navegador. O YOLO permanece no processo Python local e publica somente as métricas calculadas, evitando executar visão computacional na hospedagem web. A versão de produção está em `https://filaponte.com.br`; o endereço `chatgpt.site` permanece disponível como fallback da hospedagem.

## Fluxo (camadas da arquitetura)

1. O navegador reproduz o stream HLS original da câmera da Aduana brasileira.
2. A página consulta as métricas de trânsito pelo site e o clima diretamente na Open-Meteo.
3. `detector/teste.py` envia atualizações autenticadas de congestionamento, ROI, detecções normalizadas, sessão do contador e passagens acumuladas.
4. Um canvas transparente desenha ROI, caixas, classes e confiança sobre o vídeo original.
5. Cada visita gera um evento anônimo no banco persistente.
6. A área administrativa autenticada agrega visitas, visitantes únicos diários, origens, países e dispositivos.
7. A resposta inicial da página já contém a última situação do trânsito e conteúdo explicativo, permitindo leitura por buscadores antes da execução do JavaScript.
8. `robots.txt`, `sitemap.xml`, canonical, Open Graph e dados estruturados usam `https://filaponte.com.br` e orientam a descoberta e a indexação das páginas públicas.
9. A newsletter coleta e-mail e hora com consentimento, confirma a posse do endereço e entrega clima, histórico e trânsito atual no horário escolhido.
10. O servidor transforma o total acumulado do detector em incrementos idempotentes, agrupados pela data e hora de Foz do Iguaçu.
11. A página pública apresenta o histórico de passagens em 7 ou 30 dias, fora da imagem da câmera.
12. Um cartão abre no Google Maps a rota da aduana brasileira à paraguaia para consultar a duração atual da travessia sem usar chave de API.
13. O rodapé credita o projeto pessoal e oferece conexões públicas para o portfólio, GitHub e LinkedIn do autor.
14. O rodapé carrega o badge oficial do WakaTime para mostrar o tempo total público de programação do autor.
15. A galeria oferece oito players externos, incluindo a antiga câmera com IA, além do monitor principal da Aduana e mantém apenas a transmissão escolhida no DOM.

## Endpoints (se houver)

- `GET /api/traffic`: última telemetria disponível.
- `POST /api/traffic`: atualização autenticada enviada pelo detector Python.
- `GET /api/traffic/history?days=7|30`: resumo público diário de veículos no sentido da Ponte.
- `POST /api/analytics/visit`: registro anônimo de acesso.
- `GET /api/admin/analytics`: agregados protegidos para o painel administrativo.
- `GET /api/weather`: redirecionamento `307` para a consulta pública da Open-Meteo.
- `GET /robots.txt`: autoriza páginas públicas e bloqueia rastreamento de `/admin` e `/api`.
- `GET /sitemap.xml`: lista a página inicial e a metodologia pública.
- `GET /como-funciona`: metodologia, fontes e limitações da análise por IA.
- `POST /api/newsletter/subscribe`: pedido de inscrição e confirmação por e-mail.
- `GET /api/newsletter/confirm`: confirmação da assinatura.
- `GET|PATCH|DELETE /api/newsletter/manage`: consulta, alteração de hora e cancelamento.
- `GET|POST /api/newsletter/unsubscribe`: descadastro imediato.
- `POST /api/newsletter/send`: disparo agendado e autenticado.
- `GET /newsletter/gerenciar`: página privada de preferências.

## Estrutura de Dados (DTOs, Entidades)

- `traffic_state`: estado mais recente com score, nível, veículos, ocupação, FPS, horários, ROI e detecções serializadas.
- `visit_events`: horário, caminho, origem, campanha, país, dispositivo e identificador diário anônimo.
- `traffic_samples`: histórico agregado em janelas de cinco minutos.
- `vehicle_counter_sessions`: último total conhecido de cada execução do detector, usado para impedir dupla contagem.
- `vehicle_counts`: total de passagens por data e hora no fuso de Foz do Iguaçu.
- `newsletter_subscriptions`: e-mail, hora, confirmação e último envio.
- `newsletter_send_log`: idempotência diária sem armazenar o endereço do destinatário.
- `newsletter_rate_limits`: proteção contra abuso usando hash diário da conexão.

## Integrações externas (se houver)

- Stream HLS do Portal da Cidade.
- Open-Meteo para clima e previsão.
- Detector Python local para telemetria de congestionamento.
- Banco persistente e autenticação da hospedagem do site.
- Registro.br para a zona DNS de `filaponte.com.br`, com certificado HTTPS gerenciado pela hospedagem.
- Google Search Console, após a confirmação manual da propriedade, para acompanhar impressões, cliques e posições.
- Brevo para confirmação e entrega do resumo diário.
- cron-job.org para chamar a rota de envio em intervalos regulares.
- Google Maps URLs para a rota pública da travessia, sem integração paga nem extração automática da duração.
- Portfólio público, GitHub e LinkedIn de Ilan Wendling Thoele.
- WakaTime para o badge público e atualizado do perfil `@ilann47`, sem uso de chave de API.
- Portal da Cidade, Lógica Host, Atacado Connect e Mega Eletrônicos para as transmissões externas atribuídas na galeria.

## Tratamento de Erros

- O vídeo e o clima continuam disponíveis se o detector estiver offline.
- Métricas antigas são identificadas pela data da última atualização.
- O site não armazena endereço IP bruto.
- A área de histórico exige login e validação do identificador da conta proprietária.
- A autorização administrativa aceita o identificador específico do Site ou o e-mail confirmado do proprietário, porque o identificador encaminhado pelo login pode variar entre Sites.
- Eventos de visita com mais de 180 dias são removidos durante novas gravações.
- `/admin` e `/privacidade` usam `noindex`; rotas internas e APIs ficam fora do sitemap.
- Origem canônica inválida é substituída pelo endereço público conhecido, evitando metadados inseguros.
- A origem antiga `chatgpt.site` também é convertida para `https://filaponte.com.br`, impedindo que uma configuração legada volte a declarar conteúdo duplicado.
- Links da newsletter são assinados, tokens não ficam no banco e um registro único evita duplicidade diária.
- O cancelamento remove a assinatura e o e-mail; pedidos pendentes e registros operacionais expiram automaticamente.
- Leituras antigas sem os campos do contador continuam válidas; leituras com contador incompleto são rejeitadas.
- Se o histórico não estiver disponível, a página continua abrindo e mostra a coleta iniciada com valores zerados.
- Se o Google Maps estiver indisponível, câmera, IA, histórico e clima continuam funcionando normalmente; o cartão é apenas um link externo.
- A inscrição por e-mail fica oculta até que provedor, remetente e segredos internos estejam configurados, evitando formulário público inoperante.
- Uma falha em qualquer player externo não interfere na câmera principal, na IA nem nas APIs do Fila Ponte; o link da origem permanece disponível.

## Testes (curl ou equivalente)

- 63 testes unitários para analytics, autenticação, câmeras, clima, telemetria, SEO, newsletter, contagem de veículos, rota do Maps, conexões do rodapé, WakaTime, projeção do overlay e regressões do Lighthouse.
- Lint e build de produção aprovados.
- Rotas públicas verificadas na hospedagem: painel, clima, privacidade, publicação de telemetria e analytics.
- `/admin` verificado com redirecionamento obrigatório para login.
- Auditoria de dependências de produção sem vulnerabilidades conhecidas.
- `robots.txt`, `sitemap.xml`, canonical, JSON-LD e conteúdo inicial verificados no HTML local antes da publicação.
- Rota pública coberta por teste de origem, destino, modo de direção e ausência de chave de API.
- Newsletter coberta por testes de domínio, provedor, persistência, rotas, interface e privacidade.
- Migração `0003_right_spitfire.sql` inspecionada; TypeScript, lint e build de produção aprovados com a nova rota.
- Domínio próprio validado nos dois endereços de borda, com DNS público, HTTPS válido e resposta `200`.
- Versão 7 verificada em produção com canonical, Open Graph, robots e sitemap exclusivamente no domínio próprio.
- Credencial da telemetria renovada após reprodução de respostas `401`; publicação da revisão de ambiente e detector reiniciado com estado online validado na API pública.
- Galeria validada em desktop e celular com um único `iframe`, troca de câmera funcional, ausência de rolagem horizontal e console sem erros.

## Decisões Técnicas

- Manter o YOLO fora da hospedagem web.
- Reproduzir o HLS diretamente para preservar fluidez e reduzir custo de banda.
- Usar armazenamento persistente para histórico, nunca apenas o navegador.
- Contabilizar visitantes únicos por dia sem persistir IP bruto.
- Reter eventos por no máximo 180 dias.
- Manter o site público, mas restringir `/admin` à conta proprietária.
- Usar uma imagem social própria e metadados Open Graph para compartilhamento.
- Desenhar a camada da IA em canvas para preservar o HLS e adaptar as coordenadas a qualquer tela.
- Aceitar polígonos de ROI com até 12 pontos; a calibração atual usa os 12 pontos sobre a pista curva contornada em vermelho.
- Compartilhar uma única consulta de telemetria entre o player e o painel lateral.
- Persistir somente o overlay atual, sem histórico de caixas ou imagens.
- Usar a página inicial para a intenção “fila da Ponte da Amizade agora” e uma página separada para explicar a metodologia sem duplicar conteúdo.
- Tratar o histórico próprio como fonte de visitantes reais; as estatísticas nativas da hospedagem também contam chamadas automáticas de API.
- Consultar trânsito a cada dois segundos e pausar quando a aba estiver oculta, reduzindo carga e números artificiais de requisições.
- Renderizar a última telemetria no servidor para que o estado básico exista no HTML inicial.
- Usar âncoras HTML nas navegações simples enquanto o `next/link` do Vinext registrar erro de prefetch RSC em produção.
- Animar a barra de trânsito com `transform: scaleX()` para manter a atualização no compositor, sem recalcular layout por `width`.
- Não retransmitir o HLS apenas para eliminar alertas de cookies e volume do fornecedor externo; isso transferiria banda e custo para o site.
- Manter a newsletter em um módulo separado, com dupla confirmação, limite de 250 assinantes e horário de Foz.
- Consolidar a telemetria em cinco minutos para produzir histórico útil sem crescimento desnecessário do banco.
- Separar contagem de passagens do número instantâneo de caixas: cada rastreamento conta uma vez ao cruzar a linha virtual no sentido da Ponte.
- Persistir por hora, mas apresentar por dia, preservando o pico horário de hoje e limitando a consulta pública a 7 ou 30 dias.
- Manter o gráfico abaixo do monitor para não cobrir o vídeo, a ROI, as caixas ou as probabilidades.
- Tratar `filaponte.com.br` como a única origem canônica; o endereço técnico da hospedagem permanece acessível apenas como fallback.
- Validar uma rotação da telemetria com uma requisição autenticada sem persistência antes de iniciar o detector, distinguindo falha de credencial de falha do modelo ou do vídeo.
- Manter o tempo de travessia dentro do Google Maps: a alternativa oficial sem chave abre a rota, mas não devolve a duração para um cartão próprio.
- Abrir conexões pessoais em nova aba e manter os links institucionais do próprio site na navegação normal.
- Usar o badge público oficial do WakaTime para manter o total sincronizado sem expor chave ou depender do detector local.
- Carregar somente uma câmera externa por vez, atribuir cada transmissão ao provedor e manter a IA exclusiva da câmera principal da Aduana.

## Módulos relacionados

- [[core]]
- [[congestionamento]]
- [[contagem-veiculos]]
- [[clima]]
- [[newsletter]]
- [[cameras]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-23 | Definida a arquitetura do painel público com histórico privado de acessos. |
| 2026-08-23 | Implementados HLS, clima, telemetria, analytics anônimo, privacidade e administração protegida. |
| 2026-08-23 | Publicada a versão 1 e validado o endereço de produção. |
| 2026-08-23 | Restaurados ROI, caixas, classes e confiança sobre o vídeo ao vivo e publicada a versão 2. |
| 2026-08-23 | Adicionados SEO técnico, conteúdo indexável, metodologia pública e separação entre visitas reais e chamadas automáticas. |
| 2026-08-23 | Corrigida a autorização de `/admin` pelo e-mail confirmado do proprietário e publicada a versão 3. |
| 2026-08-23 | Removido o prefetch RSC problemático das navegações e convertida a animação da barra para transformação composta após auditoria Lighthouse. |
| 2026-08-24 | Publicada a versão 5 e validados em produção navegação sem o chunk problemático, trânsito e clima. |
| 2026-08-24 | Adicionadas inscrição diária, gestão de horário, cancelamento, histórico de trânsito e envio pela Brevo. |
| 2026-08-24 | Adicionados histórico público de passagens, rota de 7/30 dias e persistência horária idempotente. |
| 2026-08-24 | Publicada a versão 6 e verificados em produção página, API do histórico, migração e detector online. |
| 2026-08-24 | Ativado `filaponte.com.br` com registros A/TXT, validação da hospedagem e HTTPS. |
| 2026-08-24 | Corrigidos canonical, Open Graph, sitemap, robots e links gerados para o domínio próprio. |
| 2026-08-25 | Publicada a versão 7 e confirmados em produção todos os sinais canônicos de `filaponte.com.br`. |
| 2026-08-25 | Sincronizada a credencial da telemetria, republicada a configuração da versão 7 e restaurada a IA online no painel público. |
| 2026-08-26 | Adicionado cartão gratuito que abre a rota da travessia no Google Maps sem chave de API. |
| 2026-08-27 | Rodapé passou a creditar o desenvolvimento por hobby e divulgar portfólio, GitHub e LinkedIn do autor. |
| 2026-08-27 | Publicada a versão 8 e validados no domínio próprio o cartão de travessia e os links do rodapé. |
| 2026-08-27 | Adicionado ao rodapé o tempo total público e atualizado do perfil WakaTime do autor. |
| 2026-08-27 | Publicada a versão 9 e validado o badge do WakaTime no domínio próprio. |
| 2026-08-27 | Adicionada galeria responsiva com nove pontos da fronteira e carregamento de um player externo por vez. |
| 2026-08-28 | Publicada a versão 10 e confirmados galeria, metadados e telemetria no domínio próprio. |
| 2026-08-29 | Trocado o monitor principal para a Aduana e removida a IA da câmera anterior, que permaneceu na galeria. |
| 2026-08-29 | Corrigida a validação da telemetria para aceitar a ROI de 12 pontos da câmera da Aduana. |
| 2026-08-29 | Publicada a versão 12 e confirmada a IA da Aduana online no domínio próprio. |
| 2026-08-29 | Preparada a correção da ROI para excluir a fila da pista no sentido contrário. |
| 2026-08-29 | Publicada a versão 13 e confirmado o transporte da telemetria; a geometria ainda incorreta foi identificada depois por revisão visual. |
| 2026-08-29 | Atualizado o fallback web para a ROI de 12 pontos baseada no contorno vermelho da pista curva. |
| 2026-08-29 | Publicada a versão 14 e confirmado no navegador que o overlay acompanha a pista curva e exclui a via reta à direita. |
| 2026-08-29 | Publicada a versão 15 com a inferência em 320 px e a correção do limite de threads do detector. |
