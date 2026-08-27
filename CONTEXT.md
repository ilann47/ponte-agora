> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[brain/core]]

# Contexto Atual

## Fase

Versão 8 publicada no domínio próprio, com rota gratuita de travessia e conexões públicas do autor.

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
- Detector local online e alimentando telemetria.
- DNS, validação da propriedade e certificado HTTPS de `filaponte.com.br` estão ativos.
- Canonical, Open Graph, sitemap, `robots.txt` e links gerados usam `https://filaponte.com.br`; o endereço original é tratado somente como legado.
- A versão 8 está ativa e foi verificada em produção no domínio próprio.
- O cartão de travessia abre a rota pública do Google Maps sem chave de API, e o rodapé divulga portfólio, GitHub e LinkedIn do autor.
- Remoto `origin`: GitHub. Remoto `sites`: repositório interno da hospedagem.
