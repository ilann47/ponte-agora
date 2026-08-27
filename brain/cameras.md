> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[core]] · [[web]]

# Galeria de Câmeras

## Objetivo

Reunir em uma interface própria as câmeras públicas da fronteira encontradas no Portal da Cidade e no Ponte Agora, preservando a câmera principal com análise por IA e permitindo consultar as demais sem abrir vários sites.

## Contexto

A câmera da BR-277 no sentido Ponte continua sendo reproduzida diretamente por HLS no monitor principal. As outras oito visões são players externos incorporados e não recebem ROI, caixas, probabilidades nem métricas do detector local.

## Fluxo (camadas da arquitetura)

1. `lib/cameras.ts` mantém nomes, locais, provedores, players e links de origem.
2. `app/components/camera-gallery.tsx` mantém somente uma câmera externa selecionada.
3. O navegador cria um único `iframe` e troca sua origem quando o visitante escolhe outro ponto.
4. A opção principal leva de volta ao monitor HLS com IA já existente.
5. A interface identifica o provedor e oferece um link de contingência para a página original.

## Endpoints (se houver)

- Nenhum endpoint próprio foi criado.
- Os players externos são carregados diretamente no navegador pela URL pública de cada provedor.

## Estrutura de Dados (DTOs, Entidades)

- `PrimaryBorderCamera`: câmera HLS principal, sem `embedUrl` e com análise por IA.
- `EmbeddedBorderCamera`: identificador, nome, localização, provedor, URL de origem e URL do player incorporado.
- `BORDER_CAMERAS`: catálogo completo com nove pontos.
- `EMBEDDED_CAMERAS`: oito transmissões externas disponíveis no seletor.

## Integrações externas (se houver)

- Portal da Cidade e players da Lógica Host.
- Atacado Connect e seu player público.
- Mega Eletrônicos, por meio de dois players públicos hospedados no Netlify.

## Tratamento de Erros

- Se um player externo ficar indisponível, a câmera principal, a IA e o restante do site continuam funcionando.
- Cada item mostra o provedor e mantém um link para consultar a origem.
- A página informa que as transmissões externas podem falhar e que o Fila Ponte não armazena gravações.
- Apenas uma câmera externa é carregada por vez para limitar uso de banda e processamento.

## Testes (curl ou equivalente)

- O catálogo possui nove identificadores únicos e oito players externos em HTTPS.
- As cinco câmeras adicionais do Portal da Cidade apontam para páginas de origem no domínio correto.
- A galeria contém um único `iframe`, usa carregamento tardio e atualiza título e URL ao selecionar outro ponto.
- Layout validado em 1225 px e 390 px sem rolagem horizontal.
- Testada a troca da Aduana para a Ponte da Integração, preservando um único player e sem erros no console.

## Decisões Técnicas

- Manter o player principal separado evita regressões no HLS, na ROI e nas probabilidades.
- Incorporar o player oficial, em vez de retransmitir vídeo, evita custo de banda e armazenamento no Fila Ponte.
- Não montar uma grade com nove vídeos simultâneos protege o tempo de carregamento e conexões móveis.
- Atribuição visível diferencia claramente conteúdo próprio, telemetria da IA e imagens de terceiros.

## Módulos relacionados

- [[core]]
- [[web]]
- [[congestionamento]]

## Histórico

| Data | Ação |
|---|---|
| 2026-08-27 | Catalogadas nove câmeras e criada a galeria responsiva com um player externo por vez. |
