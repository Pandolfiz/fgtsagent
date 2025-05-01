## Nomenclatura de Workflows do n8n

Os workflows criados no n8n seguem o seguinte padrão de nomenclatura:

### Workflow Principal
```
[nomedousuário]_[nomedaorganização]_[nomedoagente]_[nomedotemplate]
```

Exemplo: `joao_empresaxyz_assistenteatendimento_geral`

### Subworkflows
```
[nomedousuário]_[nomedaorganização]_[nomedoagente]_sub_[nomedotemplate]
```

Exemplo: `joao_empresaxyz_assistenteatendimento_sub_processamentopedido`

Todos os nomes são normalizados para remover acentos, espaços e caracteres especiais através da função `utils.normalizeName()`.

## Armazenamento de IDs de Subworkflows

Para melhorar a performance e organização, os IDs dos subworkflows associados a um template são armazenados na coluna `n8n_subworkflow_ids` da tabela `agent_templates`. Esta coluna contém um array em formato JSONB com os IDs dos subworkflows.

Quando um novo agente é criado a partir de um template, o sistema:

1. Recupera os IDs dos subworkflows armazenados na coluna `n8n_subworkflow_ids`
2. Cria cópias de cada subworkflow com a nomenclatura apropriada
3. Cria uma cópia do workflow principal com referências atualizadas para os novos subworkflows

Isso torna o processo de criação de agentes mais eficiente, eliminando a necessidade de analisar a estrutura do workflow a cada vez que um novo agente é criado. 