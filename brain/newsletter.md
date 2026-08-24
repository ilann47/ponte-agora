> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[web]] · [[clima]] · [[congestionamento]] · [[contagem-veiculos]]

# Newsletter Diária

## Objetivo

Entregar a cada assinante, no horário escolhido, um resumo diário com previsão do tempo, histórico agregado do trânsito no sentido Paraguai e a situação observada no momento do envio.

## Contexto

A newsletter amplia o painel público sem exigir conta de usuário. A posse do e-mail é confirmada por um link assinado e o mesmo link permite alterar o horário ou cancelar a assinatura. O fuso é fixado em `America/Sao_Paulo`, correspondente a Foz do Iguaçu.

## Fluxo (camadas da arquitetura)

1. O visitante informa e-mail, hora inteira e consentimento na página inicial.
2. A API aplica limite por identificador irreversível da conexão e envia uma confirmação pela Brevo.
3. O link assinado confirma a assinatura e abre a página privada de preferências.
4. A telemetria mantém uma amostra consolidada a cada cinco minutos em `traffic_samples`.
5. Um agendador HTTPS chama a rota protegida durante cada hora do dia.
6. A rota seleciona assinantes daquele horário que ainda não receberam no dia, consulta clima, situação atual e histórico, e envia em lotes pequenos.
7. Um registro único por assinatura e data impede envio repetido.
8. O link de cada mensagem permite mudar a hora ou remover imediatamente a assinatura e o e-mail.

## Endpoints (se houver)

- `POST /api/newsletter/subscribe`: valida, limita abuso e envia confirmação ou acesso à assinatura existente.
- `GET /api/newsletter/confirm`: confirma o endereço e encaminha para a gestão.
- `GET /api/newsletter/manage`: consulta uma assinatura por token assinado.
- `PATCH /api/newsletter/manage`: altera a hora diária.
- `DELETE /api/newsletter/manage`: cancela e remove a assinatura.
- `GET|POST /api/newsletter/unsubscribe`: descadastro visível e compatível com cabeçalho de um clique.
- `POST /api/newsletter/send`: disparo protegido do lote correspondente à hora de Foz.
- `GET /newsletter/gerenciar`: interface não indexável de preferências.

## Estrutura de Dados (DTOs, Entidades)

- `newsletter_subscriptions`: e-mail normalizado, hora, fuso, estado, versão do token e datas de confirmação e envio.
- `newsletter_send_log`: estado idempotente do envio por assinatura e dia, sem endereço de e-mail.
- `newsletter_rate_limits`: hash diário da conexão e contador de tentativas.
- `traffic_samples`: uma leitura consolidada por intervalo de cinco minutos, com data e hora locais.
- `NewsletterMessage`: assunto, HTML, texto simples e URL de cancelamento.

## Integrações externas (se houver)

- Brevo Transactional Email por API HTTPS.
- cron-job.org para o disparo periódico da rota protegida.
- Open-Meteo para clima atual e previsão de hoje e amanhã.
- D1 da hospedagem para assinaturas, idempotência e histórico agregado.

## Tratamento de Erros

- Inscrição indisponível responde `503` enquanto segredos e remetente não estiverem configurados.
- O formulário, o atalho de navegação e a pergunta frequente ficam ocultos enquanto as quatro configurações obrigatórias não existirem na hospedagem.
- Tentativas acima do limite diário respondem `429`.
- Falha da Brevo libera a nova tentativa de confirmação sem expor a resposta do provedor.
- Token inválido ou expirado não revela a existência do e-mail.
- Falha de envio fica marcada para nova tentativa; um envio concluído não é repetido no mesmo dia.
- Se não houver telemetria recente, a mensagem informa que o detector está sem leitura atual.
- Pedidos pendentes expiram após sete dias; limites e logs operacionais ficam por dois dias; amostras de trânsito, por 31 dias.

## Testes (curl ou equivalente)

- Validação de e-mail, consentimento e hora.
- Conversão para o fuso de Foz e agrupamento em cinco minutos.
- Assinatura e verificação de token HMAC.
- Composição dos e-mails de confirmação e resumo diário.
- Payload e falhas da API Brevo.
- Presença das tabelas, rotas, formulário, gestão e texto de privacidade.
- Fluxo visual verificado na página local sem sobrepor câmera ou ROI.

## Decisões Técnicas

- Usar horas inteiras para tornar a escolha simples e permitir novas tentativas durante a hora.
- Limitar a 250 assinantes ativos no plano gratuito, reservando envios para confirmações e gestão.
- Não persistir o token: ele contém identificador e versão assinados por HMAC.
- Exigir confirmação antes de ativar qualquer envio diário.
- Remover o e-mail no cancelamento, mantendo apenas logs operacionais sem PII pelo prazo curto.
- Agregar trânsito em cinco minutos, evitando gravar o fluxo de telemetria de dois em dois segundos como histórico.
- Chamar a Brevo por `fetch`, sem adicionar dependência ao projeto.
- Não expor um formulário inoperante durante publicações de outras funcionalidades; habilitar a interface somente quando Brevo, remetente e segredos internos estiverem configurados.

## Módulos relacionados

- [[web]]
- [[clima]]
- [[congestionamento]]
- [[contagem-veiculos]]
- [[core]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-24 | Criados assinatura confirmada, gestão de horário, cancelamento, histórico agregado e envio diário protegido. |
| 2026-08-24 | Condicionada a interface pública à presença das configurações obrigatórias do serviço de e-mail. |
