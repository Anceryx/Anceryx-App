# Matriz de diagnóstico de MP4 no aplicativo

Use os três arquivos da mesma origem, sem reexportar entre as execuções:

| Variante | Vídeo | Áudio | Dados conhecidos |
|---|---|---|---|
| Original | H.264 High | HE-AAC v2 | 1024×576, 15,075 s, 522.063 bytes; FFmpeg decodificou sem erros |
| AAC-LC | Mesmo vídeo H.264 | AAC-LC | Aguardando arquivo de comparação |
| Sem áudio | Mesmo vídeo H.264 | Nenhum | Aguardando arquivo de comparação |

## Separar entrega de mídia e codec

1. Publique cada variante no mesmo fluxo e abra-a no mesmo contexto de DM/Feed. Anote a URL do post/mensagem e a hora; não compartilhe o ticket temporário de reprodução.
2. No DevTools do Electron, em Network, confirme `POST /media/stream-ticket` com status 200. A resposta deve fornecer o URL de playback para a mídia privada.
3. Inspecione `GET /media/files/...` ou o URL de playback: resposta completa 200 com `Content-Type: video/mp4`; para solicitações parciais, 206 com `Content-Range: bytes início-fim/tamanho` e `Accept-Ranges: bytes`. Um Range fora do arquivo deve retornar 416. Confira se o tamanho total coincide com o arquivo publicado.
4. Repita primeiro no Chromium/Chrome e depois no Anceryx Electron usando a mesma conta e a mesma variante. Guarde apenas status, cabeçalhos, `MediaError.code`, `networkState`, `readyState` e os resultados `canPlayMp4`, `canPlayAacLc` e `canPlayHeAacV2` do console do aplicativo; não copie URLs de ticket ou tokens. `canPlayType` é apenas um indício do runtime, não prova que o arquivo reproduz.

| Resultado observado | Indicação principal |
|---|---|
| Range, MIME ou tamanho incorreto em ambos | Entrega/armazenamento da mídia; investigar proxy do Blob e resposta HTTP |
| Apenas o original falha; AAC-LC e sem áudio reproduzem no mesmo Electron | Diferença no decodificador HE-AAC v2 |
| H.264 + AAC-LC e sem áudio falham igualmente no Electron, mas reproduzem no Chromium | Diferença no runtime/codec do Electron ou na integração Electron |
| Todos falham também no Chromium, com 200, `video/mp4` e Range correto | Arquivo/container/codificação; comparar com a validação externa e streams identificados |
| Ticket 401/403/404, antes da requisição de vídeo | Sessão, autorização ou acesso à mídia privada; não é evidência de codec |
| `MediaError.code` 2 | Interrupção/entrega de rede |
| `MediaError.code` 3 | Falha de decodificação |
| `MediaError.code` 4 | Origem ou formato não reconhecido; inspecionar MIME, container e suporte a codecs |

## Cobertura automatizada disponível

`anceryx-api/tests/media.test.ts` valida upload de um MP4 estrutural e resposta completa/Range com status, MIME e tamanho. Esse fixture não contém streams H.264/AAC reais. Os testes automatizados não comprovam reprodução nem suporte do Electron aos codecs. Conclusão de correção depende da matriz acima executada no aplicativo Windows com as três variantes.
