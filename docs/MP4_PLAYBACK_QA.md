# QA de recorte de banners e reprodução MP4

## Recorte de banners

O harness usa o componente `ImageCropModal` da aplicação e gera uma imagem assimétrica de quatro quadrantes. Ele reabre o arquivo exportado e verifica por pixels as cores dos quatro quadrantes.

1. No diretório `Anceryx-App`, execute `npm run test:image-crop:visual` e abra `http://127.0.0.1:5173/image-crop-visual-test.html` no navegador. Esse harness testa o componente React real sem iniciar o Electron.
2. O modal de teste será aberto automaticamente no navegador.
3. Confirme visualmente que a área de recorte mostra os quatro quadrantes coloridos. Mova o zoom, arraste a imagem e aplique.
4. Confira a imagem exportada e os resultados `Quadrantes detectados: 4/4` e `Exportação: ...`.
5. Feche ou volte à aplicação e repita a seleção de banner em Perfil e em Gerenciar Fórum. A confirmação só habilita depois do carregamento real da imagem.

O harness verifica o recorte básico por pixels; zoom e arraste ainda precisam ser exercitados visualmente nos dois fluxos do aplicativo Windows.

## Diagnóstico MP4

As três variantes abaixo já foram testadas pelo usuário no aplicativo Windows instalado e todas falharam: original H.264 High + HE-AACv2, mesmo H.264 + AAC-LC e mesmo H.264 sem áudio. Isso afasta a hipótese de falha exclusiva do HE-AACv2.

A CSP do Electron e a política HTML tinham `media-src 'self' blob:`. Elas bloqueavam as URLs HTTPS usadas pelo endpoint de mídia privada e pelo CDN público. As políticas agora permitem somente o endpoint de produção `admin-anceryx.site` e os CDNs `blob.squarecloud.dev` e `public-blob.squarecloud.dev`; `localhost:3000` só é permitido em desenvolvimento. A resposta de mídia ainda precisa ser validada com os arquivos reais.

1. Execute `npm run dev` e abra as ferramentas do Electron com `Ctrl+Shift+I`.
2. Para comparar mídia local e remota, selecione cada variante no compositor de DM sem enviar e reproduza a prévia local. Depois envie uma vez e reproduza o anexo persistido. Não repita uploads que já criaram um anexo.
3. Na aba Console, registre `[media] Video playback event`, `[media] Video playback failed`, `[media-network] response`, `[media-network] request completed` e `[media-network] request failed`. Os registros não incluem URLs, caminhos, tickets nem tokens.
4. Em Network, registre os status do ticket e da mídia, `Content-Type`, `Content-Length`, `Content-Disposition`, `Accept-Ranges`, `Content-Range`, Range solicitado, redirecionamentos e tamanho transferido. A API deve entregar 200 para a resposta completa, 206 para Range válido e 416 para Range inválido; o tipo esperado é `video/mp4` e a disposição é `inline`.
5. Compare as mesmas três variantes na prévia local, em Chromium e no Electron instalado. Registre código/mensagem de `MediaError`, `networkState`, `readyState`, dimensões e duração reportadas, e os resultados `canPlayType` do console.

`canPlayType` é apenas um indício do runtime. Os testes da API verificam cabeçalhos e Range, mas não contêm streams reais H.264/AAC e não comprovam decodificação. A CSP corrigida não equivale a comprovação de reprodução; a matriz precisa ser repetida no Electron Windows com as variantes reais.

### Novos diagnósticos sanitizados do stream privado

Na próxima QA, capture também os eventos estruturados da API:

- `private_video_ticket_issued`: confirma emissão após autorização, com escopo, MIME e prazo; não contém usuário, asset ou ticket.
- `private_video_http_response`: status e cabeçalhos que a API preparou, incluindo Range, `Content-Range` e `Content-Length`.
- `private_blob_stream`: status, origem (somente origin, nunca caminho/query), MIME, `Content-Length`, `Content-Range`, Range pedido, bytes lidos da origem e encaminhados, duração, redirecionamento e código sanitizado.
- `private_video_response_stream`: status HTTP, bytes enviados ao Electron, bytes esperados, duração e estado `complete`, `failed` ou `cancelled`.

Interpretação: sem `private_video_ticket_issued`, investigue autorização ou emissão do ticket. Com ticket emitido, mas sem `private_video_http_response`, investigue se o Electron iniciou o GET. Se a API registrou a resposta mas não houver `private_blob_stream`, a requisição pode estar usando armazenamento local ou não ter iniciado a leitura. Em Range, compare o Range pedido, status `206`, `Content-Range`, `Content-Length`, `bytesReceived` e `bytesForwarded`; valores incompatíveis agora geram `SQUARECLOUD_BLOB_RANGE_UNSUPPORTED` ou `SQUARECLOUD_BLOB_RANGE_LENGTH_INVALID`. Se a origem entrega os bytes esperados e o Electron falha antes de `loadedmetadata`/`canplay`, compare `MediaError`, `readyState`, MIME recebido e a decodificação local/remota.

Os eventos não registram IDs de usuário/asset, caminho, URL assinada, query, ticket, token nem conteúdo. Eles melhoram a próxima coleta, mas os cenários simulados não confirmam Range, redirecionamento ou integridade no serviço real SquareCloud Blob. A causa observada no Windows segue aberta até um teste com objeto privado de QA autorizado.

### Anexo privado em DM

O retorno HTTP 200 de `POST /media/stream-ticket` confirma somente a emissão do ticket. Ele não comprova que o `<video>` recebeu a URL nem que o Electron iniciou o `GET` privado. O cliente resolve o caminho recebido contra a origem configurada da API, aceita apenas os escopos privados de DM/Fórum no host da API e não registra a URL assinada. Os logs `[media] requesting private video ticket` e `[media] private video ticket ready` registram apenas o escopo/origem e a validade; os eventos do elemento e do Electron devem indicar se houve `loadstart`, requisição GET, Range e resposta.

Na próxima QA, compare um único arquivo conhecido em Home e DM. Para a DM, confirme a sequência: ticket 200 → `private video ticket ready` → `[media] Video playback event` `loadstart` → GET para `/media/files/dm-image/...` com ticket (não copie nem compartilhe o valor do query) → 200/206 com `video/mp4` e bytes → `loadedmetadata` → `canplay`. Se o ticket for emitido sem `loadstart`, preserve a linha de console sanitizada e o `MediaError`; se houver `loadstart` sem GET no servidor, capture o erro de rede/CSP no Electron. A causa da falha observada em Windows ainda não está comprovada pelo código ou pelos logs atuais.

### Fallback de reprodução para vídeo privado em DM

Quando a reprodução direta de um MP4 privado falhar com `MediaError` 2, 3 ou 4, o cliente tenta uma única alternativa: solicita um ticket novo e faz um `GET` completo sem `Range`. A resposta precisa ser `2xx`, declarar `Content-Type: video/mp4` e ter no máximo 25 MB, tanto pelo `Content-Length` antes da leitura quanto pelo tamanho real do Blob depois. O vídeo alternativo usa uma URL `blob:` temporária; ela é revogada ao repetir, desmontar o componente ou substituir a reprodução. O fallback não altera a API nem comprova qual hipótese causou a falha original.

Os erros são apresentados como falta de permissão (`401/403/404`), limite temporário (`429`), rede, formato ou arquivo maior que 25 MB. Os logs do fallback incluem somente status HTTP e categoria, sem URL, query, ticket ou token. Um `429` desabilita “Tentar novamente” por aproximadamente 15 segundos. Cada clique inicia uma única nova tentativa; não há repetição automática.

Para a próxima coleta, reproduza o mesmo vídeo privado na DM e copie o log sanitizado da API correspondente à janela de reprodução. No Network, registre o status do ticket e da mídia, `Content-Type`, `Content-Length`, `Content-Range` e Range enviado, sem copiar a URL assinada nem seu query. Compare se o fallback chegou a iniciar o GET e se a resposta completa tem tamanho e MIME esperados. A causa no servidor segue sem comprovação até essa coleta.

## SquareCloud Blob

O SDK instalado `@squarecloud/blob` v4 documenta orçamento de 5 chamadas de API por minuto sem plano e 30 por minuto no menor plano pago; a assinatura efetiva desta conta não está disponível no checkout. Uploads simples têm limite de 1 por segundo abaixo de Pro (sem limite por operação em Pro/Enterprise), não oferecem `Retry-After` e uma resposta `RATE_LIMITED` também pode sinalizar bloqueio de conta por 30 minutos. Por isso, não há retry automático. A criação de Fórum espaça uploads simples consecutivos em 1,1 s e preserva a URL do ícone após sucesso para não enviá-lo novamente. Esse espaçamento só cobre essa sequência no mesmo cliente; não coordena usuários ou processos da API. Um 429 agora retorna `MEDIA_STORAGE_RATE_LIMITED` sem repetir o envio.
