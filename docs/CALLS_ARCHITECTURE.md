# Chamadas de voz e vídeo

O cliente usa WebRTC para a mídia em tempo real e a API autenticada para
configuração e sinalização. O fluxo de sinalização reutiliza a conexão WebSocket
do aplicativo; não há endpoint público separado nem credenciais TURN embutidas
no cliente.

A API valida sessão, participantes, amizade aceita e bloqueios antes de
autorizar chamadas privadas. Canais de voz de comunidades também exigem
associação e permissão atuais. O cliente não concede acesso por conta própria.

As URLs STUN/TURN e credenciais TURN são fornecidas pela configuração do
servidor. Não registrar tokens de chamada, credenciais TURN ou conteúdo de
áudio/vídeo. Consulte a documentação privada da API para regras de autorização
e configuração operacional.
