> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[brain/core]]

# Contexto Atual

## Fase

Versão 10 publicada no domínio próprio com a galeria de nove câmeras e IA principal ativa em modo servidor.

## Decisões vigentes

- O site permanece na raiz porque `.openai/hosting.json`, o build Vinext e o histórico do Sites dependem dessa estrutura.
- O código Python, os testes e o modelo ficam isolados em `detector/`.
- A documentação viva permanece em `brain/` na raiz do projeto.
- O remoto interno do Sites será preservado como `sites`; o GitHub será o remoto principal `origin`.
- O repositório GitHub `ilann47/ponte-agora` está privado e usa `main` como branch padrão.
- Arquivos `.env`, caches, builds e artefatos temporários permanecem fora do versionamento.

## Publicação atual

- Site público principal: `https://filaponte.com.br/`.
- Endereço original da hospedagem preservado como fallback: `https://ponte-agora.ilanwendling.chatgpt.site/`.
- Detector local online e alimentando telemetria em modo headless, com YOLO em 416 px, confiança 10%, quatro threads e meta máxima de 25 FPS.
- O vídeo continua na velocidade real; a cadência medida da IA oscila conforme a carga do Ryzen local e não é artificialmente arredondada para 25 FPS.
- DNS, validação da propriedade e certificado HTTPS de `filaponte.com.br` estão ativos.
- Canonical, Open Graph, sitemap, `robots.txt` e links gerados usam `https://filaponte.com.br`; o endereço original é tratado somente como legado.
- A versão 9 está ativa e foi verificada em produção no domínio próprio.
- A versão 10 está publicada e validada no domínio próprio com oito players externos, atribuição de origem e apenas uma transmissão adicional carregada por vez.
- O cartão de travessia abre a rota pública do Google Maps sem chave de API, e o rodapé divulga portfólio, GitHub e LinkedIn do autor.
- O rodapé usa o badge oficial do perfil `@ilann47` para mostrar o tempo total de programação sempre atualizado, sem armazenar credenciais.
- Remoto `origin`: GitHub. Remoto `sites`: repositório interno da hospedagem.
