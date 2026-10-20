# Correspondência entre código-fonte e binário

Para cada versão distribuída, registrar:

1. SHA do commit usado na compilação.
2. Lockfile e respectivos hashes SHA-256.
3. Versões do Electron, Node.js, npm e electron-builder.
4. Plataforma e arquitetura de destino.
5. Comandos executados e resultados das validações.
6. Nome, tamanho e hash SHA-256 do binário.
7. Manifesto do código-fonte correspondente.

Gerar o pacote a partir do mesmo commit do binário e revisar fontes, assets,
licença e avisos de terceiros. O registro desses dados não valida assinatura,
instalação ou atualização; essas verificações precisam de evidência separada.
