# Build do cliente desktop

Este procedimento valida o cliente Electron/React a partir da raiz do repositório. Ele não instala nem compila a API privada.

## Instalação e verificações

```text
npm ci
npm run typecheck
npm run build
npm run test:api-config
npm run test:connection-config
npm run test:update-security
npm run test:license-audit
npm run test:encoding
```

O workflow CI usa Node.js 22. O `build` gera os bundles Electron/React e os avisos de licença instalados.

## Instalador Windows

```text
npm run electron:build -- --publish never
```

O workflow Windows cria artefatos para revisão e não publica Releases. Uma compilação local não comprova assinatura, instalação, atualização nem QA funcional do instalador.

O renderer empacotado usa a origem segura `app://anceryx` e a URL oficial da API configurada para o cliente. Não inclua segredos privados em variáveis `VITE_*`, no `.env.example` nem nos artefatos.

## Snapshot de código-fonte

The script `scripts/export-public-client.ps1` creates an additional client package from an explicit allowlist. Run and review it again against the exact commit before distribution; a historical run does not validate the current contents.
