# Modelo de segurança do atualizador

## Fluxo de confiança

- O feed é o asset `update-manifest.json` da Release oficial `Anceryx/Anceryx-App`.
- A chave Ed25519 pública confiável deve estar compilada no processo principal. A chave privada só pode existir em um secret protegido do GitHub Actions.
- O cliente valida o esquema fechado do manifest, a assinatura Ed25519, versão SemVer crescente, canal, nome e URL exatos do instalador, tamanho máximo de 500 MiB e SHA-512.
- A assinatura é verificada antes de solicitar a URL do instalador. Redirecionamentos são limitados e aceitos apenas em HTTPS nos hosts permitidos do GitHub.
- O instalador é gravado em arquivo temporário exclusivo, com limite de bytes, e só fica disponível à interface depois que tamanho e SHA-512 forem conferidos. O arquivo fica somente para leitura e o processo principal confere novamente tipo, tamanho e SHA-512 imediatamente antes de abrir o NSIS após a ação explícita do usuário.
- IPC continua protegido por `isTrustedRenderer`. A interface não escolhe URL nem caminho de arquivo.

## Estado fechado por padrão

Em `0.17.1`, `UPDATE_MANIFEST_PUBLIC_KEY_PEM` está vazio e `UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED` está `false`. Portanto o updater não inicia chamadas de rede, não baixa arquivos e não abre instaladores. O gerador e o workflow recusam assinar ou publicar sem uma chave privada que corresponda à chave pública fixada e sem ativação explícita no cliente.

As versões estáveis disponíveis nesta revisão local são `electron-builder` 26.18.0 e `electron-updater` 6.8.11; o suporte nativo Ed25519 consultado aparece em versões alpha 27/7. Para não depender de alpha, o cliente implementa verificação independente com `node:crypto` e removeu `electron-updater`. A verificação foi testada com chaves efêmeras de teste; nenhuma chave de produção foi criada ou embutida.

## Limites e ameaças

O hash SHA-512 sozinho não autentica o manifest; ele só é confiável depois de verificar a assinatura. O HTTPS do GitHub protege o transporte e ajuda a disponibilidade, mas não substitui a assinatura. Um manifest assinado não prova que o aplicativo foi assinado por Authenticode; o instalador permanece sem assinatura de código até configuração separada.

O cliente não baixa automaticamente e não instala em silêncio. Depois de uma ação explícita de download, o usuário ainda confirma o instalador NSIS. A versão v0.17.0 deve ser instalada manualmente; não alterar sua tag ou Release como parte desta preparação.

A conferência imediatamente antes da abertura detecta substituições ocorridas depois do download. Como o NSIS é aberto pelo caminho usando o shell do Windows, um processo local com os mesmos privilégios ainda poderia tentar uma substituição concorrente entre a última leitura verificada e a abertura do arquivo. A chave Ed25519 impede adulteração remota do manifest/arquivo, mas não substitui uma assinatura Authenticode nem protege contra comprometimento do perfil Windows do usuário.

Antes de habilitar a chave real, testar manifestação ausente, assinatura incorreta, chave errada, alteração de cada campo assinado, canal divergente, downgrade, versão igual, URL externa/insegura, tamanho/hash incorretos, redirecionamentos, falha/interrupção de rede, chamadas duplicadas, IPC não confiável e preservação de dados em instalação sobreposta no Windows.
