# Ponte Agora

Monitor público da BR-277 no sentido da Ponte da Amizade. O sistema combina vídeo HLS ao vivo, detecção local de veículos por YOLO, estimativa de congestionamento, contagem diária de passagens, previsão do tempo e histórico privado de acessos.

Site: [ponte-agora.ilanwendling.chatgpt.site](https://ponte-agora.ilanwendling.chatgpt.site/)

## Estrutura

```text
ponte-agora/
├── app/                    # Páginas e APIs do site
├── db/                     # Persistência D1 e repositórios
├── detector/               # Detector Python, modelo YOLO e testes
│   ├── tests/
│   └── yolo11n.pt
├── drizzle/                # Migrações do banco
├── lib/                    # Regras de domínio do site
├── public/                 # Arquivos públicos
├── tests/                  # Testes TypeScript
├── brain/                  # Documentação técnica viva
└── .openai/hosting.json    # Configuração da hospedagem Sites
```

## Requisitos

- Node.js 22.13 ou superior.
- Python 3.12.
- Câmera/stream acessível pela internet.

## Instalação

```bash
npm ci
python -m venv .venv
.venv/Scripts/python -m pip install -r detector/requirements.txt
```

Copie `.env.example` para um arquivo local de ambiente e preencha apenas no computador ou na hospedagem. Nunca envie chaves ao Git.

## Executar

Site local:

```bash
npm run dev
```

Detector local:

```bash
npm run start:detector
```

O detector espera `PONTE_WEB_API_URL` e `PONTE_WEB_TELEMETRY_TOKEN` no ambiente para publicar no painel web. Sem essas variáveis, a janela local continua funcionando, mas não envia métricas.

## Verificação

```bash
npm run test:all
npx tsc --noEmit
npm run lint
npm run build
```

## Observações

- O vídeo é reproduzido diretamente da origem HLS; o projeto não retransmite a câmera.
- ROI, caixas e probabilidades são desenhadas no navegador sobre o vídeo.
- A contagem e o congestionamento são estimativas por IA, não dados oficiais da aduana.
- A newsletter permanece oculta enquanto o provedor de e-mail e os segredos obrigatórios não estiverem configurados.

Consulte [[PROJECT]], [[REQUIREMENTS]], [[ROADMAP]], [[CONTEXT]] e a pasta [[brain/core]] para detalhes técnicos.
