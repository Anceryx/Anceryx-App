# Propostas para a API de mídia

Estas propostas são solicitações para avaliação no repositório privado da API. O cliente A3 não pressupõe que qualquer item já exista e não introduz endpoints ou alterações de contrato além do `POST /media/stream-ticket` atual.

1. **Cachear o arquivo no servidor:** depois da primeira leitura do objeto no Blob, servir as próximas requisições e ranges a partir de cache do servidor, evitando uma leitura do provedor por cada `Range` solicitado pelo player.
2. **Reutilizar o ticket durante a reprodução:** permitir que o mesmo ticket autorizado continue válido para as requisições do arquivo ao longo da sessão de reprodução, respeitando expiração, escopo e autorização original.
3. **Otimizar MP4 no upload:** reprocessar ou remuxar o arquivo com `ffmpeg -movflags +faststart` para mover os metadados necessários ao início do arquivo, validando o resultado e preservando compatibilidade.
4. **Propagar limite temporário do Blob:** quando SquareCloud Blob limitar a leitura, a API deve responder `429` com um `Retry-After` útil para o cliente, sem mascarar o limite como erro genérico.
5. **Ajustar cache de preflight CORS:** configurar `maxAge` adequado para reduzir preflights repetidos durante as requisições de mídia, mantendo a lista de origens e cabeçalhos restrita.
6. **Disponibilizar verificação de saúde:** fornecer uma rota `GET /health` que indique a disponibilidade da API sem expor segredos nem dados privados e possa ser usada em diagnóstico operacional.

Antes de implementar qualquer proposta, confirmar o contrato atual, a semântica do armazenamento e as restrições do provedor no repositório da API.
