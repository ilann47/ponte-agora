> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[contagem-veiculos]] · [[clima]] · [[web]]

# Congestionamento

## Objetivo

Estimar o nível de congestionamento na pista em direção à Ponte da Amizade a partir da quantidade de veículos e da ocupação visual da pista.

## Contexto

A câmera principal mostra a Aduana brasileira em 1920×1080, com uma via curva e fluxos opostos. A ROI de 12 pontos reproduz a pista contornada em vermelho: entra pela borda inferior esquerda e converge no topo central. O recorte amplia essa área para o modelo; a entrada de 416 px e confiança 10% continuam preservadas.

## Fluxo (camadas da arquitetura)

1. Capturar e exibir frames continuamente no loop principal.
2. Enviar um frame ao worker somente quando ele estiver livre, sem criar fila.
3. Recortar o retângulo envolvente da ROI com uma pequena margem.
4. Executar YOLO no recorte somente para classes de veículos.
5. Remapear as caixas para as coordenadas do frame completo.
6. Filtrar caixas pelo ponto de contato com a ROI poligonal.
7. Calcular contagem, ocupação sem sobreposição e score bruto.
8. Reaproveitar o último resultado enquanto a próxima inferência está em andamento.
9. No modo visual, reduzir o frame para 1100×650 e remapear as detecções para essa resolução.
10. No modo visual, suavizar o score e desenhar painel, ROI e detecções na imagem de exibição; no modo servidor, omitir somente esse desenho local.
11. Aguardar apenas o tempo restante do quadro para manter a reprodução em 25 FPS.
12. Normalizar ROI e caixas para coordenadas entre 0 e 1.
13. Publicar leitura, classes e probabilidades no site em segundo plano, no máximo uma vez por segundo e sem fila.
14. Entregar as detecções aceitas ao [[contagem-veiculos]] somente quando uma nova inferência for concluída.

## Endpoints (se houver)

- Consome o stream HLS e, quando `PONTE_DETECTOR_HEADLESS` não está ativo, exibe uma janela local.
- Publica em `POST /api/traffic` do [[web]] quando a conexão está configurada.

## Estrutura de Dados (DTOs, Entidades)

- `Detection`: classe, confiança e caixa delimitadora.
- `CongestionMetrics`: score, quantidade e ocupação.
- `CongestionAnalysis`: métricas e detecções aceitas pela ROI.
- `ExponentialSmoother`: estado do score suavizado.
- `InferenceSnapshot`: análise concluída e duração da inferência.
- `AsyncInferenceWorker`: executor de uma única inferência, sem fila de frames.
- `AsyncTelemetryPublisher`: executor de uma única publicação web, sem fila de leituras.
- `VehiclePassageCounter`: rastreador leve que emite passagens únicas para a telemetria.

## Integrações externas (se houver)

- Stream HLS do Portal da Cidade.
- Modelo local `yolo11n.pt` executado pela biblioteca Ultralytics.
- Painel [[web]] para publicação autenticada da telemetria.
- HLS público da câmera `fozaduanapontedaamizade.stream` fornecido pela Lógica Host ao Portal da Cidade.

## Tratamento de Erros

- Reconexão após falhas consecutivas de leitura.
- Liberação garantida da captura e das janelas.
- Validação antecipada dos parâmetros do cálculo.
- Limite de 64 caixas por publicação e coordenadas sempre recortadas ao intervalo de 0 a 1.
- Sessões do contador recebem UUID novo a cada execução, evitando misturar totais após reinício.

## Testes (curl ou equivalente)

Executar `cd detector && python -m unittest discover -s tests -v`.

Cobertura funcional atual:

- Limites dos quatro níveis de congestionamento.
- Escala de coordenadas normalizadas.
- Inclusão pela base da caixa dentro da ROI.
- União de caixas sobrepostas e recorte nos limites do frame.
- Validação da configuração e suavização exponencial.
- Importação segura do executável e calibração da inferência.
- Recorte da ROI e remapeamento das caixas para o frame original.
- Worker assíncrono sem fila e reaproveitamento do último resultado concluído.
- Travessia única na direção correta, direção oposta ignorada, múltiplos veículos e expiração de rastros.

Validação de 2026-08-23:

- 29 testes automatizados aprovados, incluindo serialização, limites e publicação assíncrona da telemetria.
- Imagem de referência após otimização: 6 veículos na ROI, ocupação de 1,902% e score de 20%.
- Stream real em 2560×1440: média de 107,4 ms em 10 frames, equivalente a 9,3 FPS de inferência.
- Baseline anterior no mesmo stream: média de 260,0 ms, equivalente a 3,8 FPS de inferência.
- Pipeline assíncrono no stream real: 125 frames em 5,067 s, equivalente a 24,7 FPS de vídeo e 8,4 FPS de IA.
- Pipeline com painel meteorológico: 125 frames em 5,080 s, equivalente a 24,6 FPS de vídeo e 6,9 FPS de IA.
- Pipeline visual otimizado, após aquecimento da IA: 125 frames em 3,56 s, equivalente a 35,1 FPS de processamento sem janela e 6,1 FPS de IA.
- Reprodução limitada após a otimização: 100 frames em 4,04 s, equivalente a 24,72 FPS e à velocidade original da câmera.
- Detector reiniciado após a publicação do overlay: 3 carros enviados ao site, vídeo a 24,6 FPS e IA a 15,6 FPS.

Validação de 2026-08-28:

- 36 testes automatizados aprovados e compilação Python válida.
- A configuração de 416 px no pipeline completo ficou em torno de 16 FPS de IA, abaixo do benchmark isolado.
- O benchmark de threads em 320 px mediu 17,7 FPS com 2 threads, 30,2 com 4, 30,0 com 6 e 23,6 com 8; quatro threads foram escolhidas por melhor desempenho e menor contenção.
- A comparação no mesmo quadro escolheu 416 px e confiança 10%: cinco veículos aceitos em cerca de 47 ms, contra perda de objetos na configuração de 320 px.
- A configuração final em modo servidor preservou o vídeo em aproximadamente 25 FPS, detectou até cinco veículos com classes e probabilidades e apresentou mediana de 17,0 FPS de IA em oito amostras reais sob alta carga do computador.
- A telemetria pública confirmou estado online, ROI e detecções atualizadas no domínio próprio.

Validação de 2026-08-29:

- Stream da Aduana confirmado em 1920×1080; manifesto principal, variante e segmento responderam `200` com CORS público.
- A calibração inicial de 12 pontos foi descartada por cobrir uma área ampla sem seguir os limites visuais da pista.
- A tentativa seguinte de 10 pontos também foi descartada: ela ficou deslocada para a via reta à direita e para a árvore.
- A ROI atual usa 12 pontos extraídos do contorno vermelho fornecido pelo usuário e fecha pelas bordas esquerda e inferior do vídeo.
- Três quadros reais reconheceram 7–8 carros dentro dessa pista, com ocupação entre 9,4% e 9,8%; a inspeção do overlay confirmou a exclusão da via reta à direita.
- 37 testes Python aprovados após a troca do stream e da calibração.
- As leituras da versão 12 com 9 a 14 detecções expuseram o erro de direção e não devem ser usadas como validação do sentido Ponte.

## Decisões Técnicas

- Usar coordenadas normalizadas para a ROI.
- Medir a união das caixas para não contar pixels sobrepostos duas vezes.
- Separar cálculo puro do loop de vídeo para permitir testes rápidos.
- Usar o ponto inferior central da caixa como contato do veículo com a pista.
- Recortar a pista com margem de 5% e inferir em 416 px com confiança 0,10 e NMS IoU 0,40.
- Remapear as caixas do recorte para o frame completo antes da análise e do desenho.
- Limitar a inferência a no máximo 25 FPS; resultados mais lentos são publicados com a cadência real, sem maquiar a métrica.
- Usar o modo servidor para remover o custo da janela local quando o objetivo é alimentar o site, sem alterar ROI, caixas ou probabilidades publicadas.
- Limitar o PyTorch a quatro threads, configuração mais rápida no benchmark deste Ryzen e menos sujeita à contenção que oito threads.
- Executar a IA em um `ThreadPoolExecutor` com apenas um worker.
- Nunca enfileirar frames: se a IA estiver ocupada, manter o último resultado e continuar exibindo o vídeo.
- Mostrar separadamente FPS do vídeo e da IA para tornar o desempenho observável.
- Redimensionar primeiro para a resolução da janela e desenhar nela os efeitos translúcidos, evitando processar 2560×1440 apenas para elementos visuais.
- Remapear as caixas detectadas para a resolução de exibição sem alterar as coordenadas usadas pelo cálculo de congestionamento.
- Limitar o ciclo completo a 25 FPS; o tempo de leitura e desenho é descontado da espera para não tornar o vídeo lento.
- Atualizar a média exponencial a cada 2 segundos com alfa 0,35, mantendo as detecções visuais em tempo real.
- Publicar o overlay a cada segundo; o score continua suavizado no intervalo próprio de 2 segundos.
- Normalizar caixas no frame original para o site projetá-las corretamente em telas responsivas.
- Na pista curva da câmera da Aduana, manter inicialmente o limite em 24 veículos e 18% de ocupação até acumular amostras suficientes para nova calibração.
- Atualizar o contador apenas com snapshots novos da IA, nunca a cada quadro reapresentado do vídeo.

## Módulos relacionados

- [[core]]
- [[contagem-veiculos]]
- [[clima]]
- [[web]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-23 | Definido o desenho inicial da melhoria do detector de congestionamento. |
| 2026-08-23 | Implementadas ROI da pista direita, inferência noturna, ocupação por união, painel e suavização. |
| 2026-08-23 | Verificados testes automatizados, imagem fornecida e stream HLS real. |
| 2026-08-23 | Recortada a pista antes do YOLO, reduzindo a inferência de 260,0 ms para 107,4 ms em média. |
| 2026-08-23 | Desacoplados vídeo e IA, elevando a exibição medida de 9,3 para 24,7 FPS. |
| 2026-08-23 | Transferido o desenho da ROI, caixas e painel para 1100×650, reduzindo o custo visual por quadro. |
| 2026-08-23 | Corrigida a reprodução acelerada com controle de ritmo verificado em 24,72 FPS. |
| 2026-08-23 | Adicionada publicação autenticada e não bloqueante das métricas no painel web. |
| 2026-08-23 | Incluídas ROI, classes, caixas e probabilidades na telemetria web normalizada. |
| 2026-08-24 | Integradas as detecções ao contador de passagens sem alterar o ritmo de 25 FPS nem o overlay. |
| 2026-08-28 | Calibrada a IA em 416 px, confiança 10% e quatro threads; no teste real foram reconhecidos até cinco veículos com vídeo a 25 FPS. |
| 2026-08-29 | Transferidos stream, ROI e calibração para a Aduana; a nova visão reconheceu até 19 veículos no teste real. |
| 2026-08-29 | Confirmada em produção a telemetria da Aduana com ROI, caixas e probabilidades atualizadas. |
| 2026-08-29 | Tentativa de ROI de 10 pontos publicada e posteriormente rejeitada por estar deslocada para a via reta à direita. |
| 2026-08-29 | Redesenhada a ROI com 12 pontos sobre o contorno vermelho e confirmados 7–8 carros em três quadros reais da pista curva. |
