> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[congestionamento]]

# Clima

## Objetivo

Exibir no painel as condições meteorológicas atuais de Foz do Iguaçu e as previsões de hoje e amanhã sem bloquear o vídeo ou a inferência de veículos.

## Contexto

O monitor opera continuamente e não pode depender da disponibilidade de uma API externa para manter a imagem fluida. Os dados meteorológicos são complementares e devem usar cache do último resultado válido.

## Fluxo (camadas da arquitetura)

1. `AsyncWeatherService` verifica se a atualização está vencida.
2. Uma thread consulta a Open-Meteo sem bloquear o loop do OpenCV.
3. `fetch_weather` decodifica o JSON e valida todos os campos obrigatórios.
4. O código WMO é convertido em uma descrição curta em português.
5. O painel reutiliza o último `WeatherReport` até uma nova resposta válida.
6. Após sucesso, a próxima consulta ocorre em 10 minutos; após erro, em 1 minuto.
7. O clima atual ocupa duas linhas e as previsões de hoje e amanhã ocupam uma linha cada.
8. O painel amplia a tipografia conforme a resolução e encerra antes do início da ROI.
9. A versão web consulta a Open-Meteo diretamente no navegador e exibe cartões de agora, hoje e amanhã.
10. A rota `/api/weather` responde com redirecionamento temporário para a fonte pública, sem depender de uma subconsulta do Worker hospedado.
11. Após uma falha, o navegador preserva o último resultado válido e tenta novamente em 1 minuto; após sucesso, atualiza em 10 minutos.

## Endpoints (se houver)

- `GET https://api.open-meteo.com/v1/forecast`
- `GET /api/weather`: redirecionamento `307` compatível para a URL pública da Open-Meteo.
- Coordenadas: latitude `-25.5163`, longitude `-54.5854`.
- Fuso horário: `America/Sao_Paulo`.
- `current`: temperatura, sensação, precipitação, código WMO e vento.
- `daily`: código WMO, mínimas, máximas e probabilidade máxima de chuva.
- Horizonte: dois dias.

## Estrutura de Dados (DTOs, Entidades)

- `CurrentWeather`: observação, temperatura, sensação, precipitação, código e vento.
- `DailyForecast`: data, mínima, máxima, chance de chuva e código WMO.
- `WeatherReport`: clima atual, previsão de hoje e previsão de amanhã.

## Integrações externas (se houver)

- Open-Meteo Forecast API, sem chave de acesso e sem nova dependência Python.
- Rota `GET /api/weather` do [[web]] para evitar chamadas repetidas de cada navegador.

## Tratamento de Erros

- Timeout de 8 segundos na consulta HTTP.
- Respostas ausentes ou incompletas geram `WeatherDataError`.
- Uma falha preserva o último resultado válido.
- Sem cache disponível, o painel informa indisponibilidade e tenta novamente em 1 minuto.
- Na web, a consulta ocorre no navegador para não compartilhar o limite de origem do Worker com outras aplicações hospedadas.

## Testes (curl ou equivalente)

Executar `cd detector && python -m unittest discover -s tests -v`.

Os testes cobrem URL sem chave, parser, dois dias obrigatórios, códigos WMO, intervalo de sucesso, intervalo de nova tentativa, cache após erro e formatação do painel.

Validação de 2026-08-23:

- Consulta real concluída sem erro e sem chave de API.
- Painel renderizado com clima atual, hoje e amanhã.
- Pipeline completo medido em 24,6 FPS de vídeo e 6,9 FPS de IA.
- Suíte completa com 25 testes automatizados aprovados.
- Prévia em 1100×650 verificada com painel terminando em `y=211` e ROI começando em `y=227`.
- Pipeline visual otimizado, após aquecimento da IA: 35,1 FPS de processamento sem janela e 6,1 FPS de IA.
- Rota web publicada reproduzida com `503`, enquanto a Open-Meteo respondeu `200` para a mesma consulta.
- Correção web aprovada com 23 testes, lint, build e consulta real retornando clima atual, hoje e amanhã.

## Decisões Técnicas

- Usar somente a biblioteca padrão (`urllib`) para não adicionar dependências.
- Atualizar em thread própria para preservar os 25 FPS do vídeo.
- Usar textos ASCII porque a fonte Hershey do OpenCV não renderiza acentos corretamente.
- Exibir atribuição `Clima: Open-Meteo` no painel.
- Dividir temperatura/sensação e chuva/vento em linhas distintas para ganhar legibilidade.
- Dimensionar fontes, espaçamentos e painel juntos, preservando uma margem antes da ROI.
- Consultar a fonte sem chave diretamente no navegador web para evitar falhas de saída do Worker hospedado; a API permite CORS público.
- Manter `/api/weather` como redirecionamento para compatibilidade, sem executar a consulta externa no servidor.

## Módulos relacionados

- [[core]]
- [[congestionamento]]
- [[web]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-23 | Criado serviço meteorológico com clima atual e previsão de hoje e amanhã. |
| 2026-08-23 | Integrado painel assíncrono com cache e nova tentativa automática. |
| 2026-08-23 | Verificados API real, renderização e desempenho do pipeline completo. |
| 2026-08-23 | Ampliada a tipografia, separadas as condições atuais em duas linhas e protegido o espaço da ROI. |
| 2026-08-23 | Reaproveitada a previsão de dois dias no painel web público. |
| 2026-08-23 | Removida a subconsulta meteorológica do Worker hospedado após falhas `503`; navegador e rota de compatibilidade passaram a usar a fonte pública diretamente. |
| 2026-08-23 | Publicada a correção na versão 4 e validado em produção o clima atual e as previsões de hoje e amanhã. |
