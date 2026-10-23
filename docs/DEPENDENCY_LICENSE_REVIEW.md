# Revisão de licença de dependências

## Revisão de 23/10/2026

A auditoria do workflow Windows registrou duas ocorrências classificadas como revisão manual:

- `lightningcss@1.32.0`
- `lightningcss-win32-x64-msvc@1.32.0`

Os metadados do lockfile identificam ambos como `MPL-2.0`. O primeiro é uma dependência de desenvolvimento usada pela cadeia de estilos; o segundo é o binário opcional x64 para Windows da mesma ferramenta. Ambos estão marcados como dependências de desenvolvimento, e a configuração do Electron lista a saída compilada (`out/**/*`) como conteúdo do aplicativo.

**Resultado:** a classificação MPL-2.0 é reconhecida, mas requer revisão técnica e jurídica específica. O registro acima documenta a identificação, o escopo aparente de uso e a configuração observada; não constitui aprovação jurídica automática, conclusão sobre obrigações de distribuição nem confirmação por inspeção do instalador. Não foram alteradas as dependências nem removidos os avisos de licença.
