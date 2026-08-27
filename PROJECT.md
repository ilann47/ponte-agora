> Links: [[STATE]] · [[REQUIREMENTS]] · [[ROADMAP]] · [[CONTEXT]] · [[brain/core]]

# Projeto Ponte Agora

## Visão

Oferecer uma consulta gratuita e simples da fronteira, reunindo nove câmeras ao vivo, leitura visual por IA na BR-277, clima e histórico diário de veículos no sentido Paraguai.

## Arquitetura

- Site Next/Vinext na raiz do repositório.
- Detector local em `detector/`, com YOLO, OpenCV e publicação autenticada.
- Banco D1 para estado atual, histórico agregado, analytics e newsletter.
- Open-Meteo para previsão do tempo.
- Sites para hospedagem pública.

## Princípios

- O HLS é consumido diretamente da origem.
- Players externos são incorporados com atribuição e somente um deles é carregado por vez.
- O vídeo mantém o ritmo original de 25 FPS.
- A IA nunca bloqueia o loop de exibição.
- Nenhuma chave, e-mail de assinante ou endereço IP bruto entra no repositório.
- Contagem e congestionamento são apresentados como estimativas.

## Estado

Consulte [[STATE]] para o estado operacional, [[REQUIREMENTS]] para o escopo, [[ROADMAP]] para as fases e [[CONTEXT]] para as decisões da fase atual.
