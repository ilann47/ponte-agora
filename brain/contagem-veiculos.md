> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[congestionamento]] · [[web]] · [[newsletter]]

# Contagem de Veículos

## Objetivo

Estimar quantos veículos passam pela área monitorada no sentido da Ponte da Amizade, contando cada rastreamento uma única vez e oferecendo histórico público diário de 7 ou 30 dias.

## Contexto

O número instantâneo de caixas do YOLO informa quantos veículos aparecem em uma leitura, mas não representa fluxo. Somar essas caixas repetiria o mesmo veículo em vários snapshots. Por isso, este módulo acompanha o ponto inferior central das detecções e reconhece somente a travessia de uma linha virtual dentro da ROI.

## Fluxo (camadas da arquitetura)

1. [[congestionamento]] entrega as detecções aceitas sempre que uma inferência nova termina.
2. `VehiclePassageCounter` associa cada ponto de contato ao rastro recente mais próximo.
3. Uma zona de histerese impede contagens causadas por pequenas oscilações ao redor da linha.
4. O rastro é contado quando passa de baixo para cima na imagem, direção visual da Ponte.
5. O detector publica UUID da sessão e total acumulado em `POST /api/traffic`.
6. O [[web]] compara o total com o último valor da sessão e grava somente o incremento novo.
7. O incremento é somado ao bucket de data e hora de Foz do Iguaçu.
8. A página agrega os buckets por dia e mostra o período selecionado.

## Endpoints (se houver)

- `POST /api/traffic`: recebe `counterSessionId` e `vehiclePassages` junto da telemetria existente.
- `GET /api/traffic/history?days=7|30`: retorna totais, média, pico diário, pico horário de hoje e série diária preenchida.

## Estrutura de Dados (DTOs, Entidades)

- `VehiclePassageCounter`: rastros ativos, posição anterior, lado estável e estado de contagem.
- `counterSessionId`: UUID sem dados pessoais, renovado a cada execução do detector.
- `vehiclePassages`: total crescente da sessão atual.
- `vehicle_counter_sessions`: último total recebido por sessão e horário da atualização.
- `vehicle_counts`: chave composta por data e hora, com total acumulado de passagens.
- `VehicleHistorySummary`: hoje, total, média diária, pico diário, pico horário e série temporal.

## Integrações externas (se houver)

- Detecções do YOLO produzidas por [[congestionamento]].
- Banco D1 e painel público do [[web]].

## Tratamento de Erros

- Telemetria legada sem contador continua aceita para não derrubar o monitor atual.
- Se um campo do contador vier sem o outro, a leitura é rejeitada.
- Totais que diminuem dentro da mesma sessão não geram contagem adicional.
- Rastros ausentes expiram após oito atualizações para não unir veículos distantes.
- Sessões sem atualização por dois dias são removidas; o histórico agregado permanece.
- Falha na leitura do histórico não impede a abertura da página pública.

## Testes (curl ou equivalente)

- `cd detector && python -m unittest discover -s tests -p "test_*.py" -v`: 34 testes aprovados, incluindo cinco cenários do contador.
- `npm test`: 55 testes aprovados, incluindo contrato da telemetria, buckets, persistência, API e interface do histórico.
- `npx tsc --noEmit`, `npm run lint` e `npm run build`: aprovados.
- Migração Drizzle `0003_right_spitfire.sql`: cria as duas tabelas e o índice diário sem alterar dados existentes.

## Decisões Técnicas

- Usar rastreamento leve por proximidade em vez de adicionar uma biblioteca de tracking.
- Considerar o ponto inferior central da caixa, coerente com a filtragem da ROI.
- Posicionar a linha em 58% da altura da imagem e usar histerese de 1,2%.
- Contar somente movimento para cima na imagem, que corresponde ao sentido da Ponte nesta câmera fixa.
- Publicar total acumulado por sessão e calcular o delta no servidor para tolerar repetição da telemetria.
- Persistir por hora para permitir pico do dia, mas exibir agregação diária para leitura simples.
- Identificar o gráfico como estimativa por IA e mantê-lo fora do vídeo ao vivo.

## Módulos relacionados

- [[core]]
- [[congestionamento]]
- [[web]]
- [[newsletter]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-24 | Criado o contador de passagem única com sessão idempotente. |
| 2026-08-24 | Adicionadas persistência horária, API e visualização pública de 7/30 dias. |
| 2026-08-24 | Publicada a versão 6, reiniciado o detector com chave renovada e confirmada a primeira passagem real. |
