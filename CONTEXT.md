> Links: [[PROJECT]] · [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[brain/core]]

# Contexto Atual

## Fase

Organização e distribuição do projeto como um único repositório.

## Decisões vigentes

- O site permanece na raiz porque `.openai/hosting.json`, o build Vinext e o histórico do Sites dependem dessa estrutura.
- O código Python, os testes e o modelo ficam isolados em `detector/`.
- A documentação viva permanece em `brain/` na raiz do projeto.
- O remoto interno do Sites será preservado como `sites`; o GitHub será o remoto principal `origin`.
- O repositório GitHub `ilann47/ponte-agora` está privado e usa `main` como branch padrão.
- Arquivos `.env`, caches, builds e artefatos temporários permanecem fora do versionamento.

## Publicação atual

- Site público: `https://ponte-agora.ilanwendling.chatgpt.site/`.
- Detector local online e alimentando telemetria.
- Domínio `filaponte.com.br` ainda depende da conclusão do DNS.
- Remoto `origin`: GitHub. Remoto `sites`: repositório interno da hospedagem.
