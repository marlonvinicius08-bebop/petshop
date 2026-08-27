# Guia de Implementação da Arquitetura

## 1. Objetivo

Este documento deve servir como **guia de implementação para o assistente de IA local** responsável pelo desenvolvimento da plataforma.

A arquitetura deve priorizar:

- segurança em profundidade;
- princípio do menor privilégio;
- isolamento entre componentes;
- separação entre interfaces, gateway e APIs de domínio;
- segmentação de rede;
- controle de acesso ao banco de dados;
- escalabilidade independente;
- rastreabilidade e auditoria;
- redução da superfície de ataque.

> **Princípio fundamental:** a segurança da plataforma não deve depender de esconder nomes, IPs, containers, rotas ou APIs. Mesmo conhecendo toda a arquitetura, um atacante deve encontrar componentes isolados e com acesso somente aos recursos estritamente necessários.

---

# 2. Visão Geral

A plataforma deve ser organizada nas seguintes camadas:

```text
Internet
   │
   ▼
Reverse Proxy / WAF
   │
   ├───────────────────────────────┐
   │                               │
   ▼                               ▼
Front-ends                     API Gateway
   │                           / Barramento
   │                               │
   ├── Web Pública                 │
   ├── Área Cliente                │
   └── Área Gestão                 │
                                   ▼
                            APIs de domínio
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                   Pet        Financeiro        Agenda
                                   │
                          ┌────────┼────────┐
                          ▼        ▼        ▼
                        Renda    Gastos  Investimentos
                                   │
                                   ▼
                              PostgreSQL
```

Cada camada deve possuir responsabilidades claramente definidas.

---

# 3. Front-end

O front-end da plataforma será dividido inicialmente em três aplicações independentes.

## 3.1 Web Pública

Responsável pelas páginas acessíveis sem autenticação.

Exemplos:

- página inicial;
- informações institucionais;
- conteúdos públicos;
- notícias;
- serviços públicos;
- agenda pública.

Container sugerido:

```text
web-publica
```

---

## 3.2 Área do Cliente

Aplicação destinada aos usuários autenticados.

Exemplos:

- dados pessoais;
- pets;
- serviços contratados;
- agendamentos;
- histórico;
- informações financeiras permitidas ao cliente.

Container sugerido:

```text
web-cliente
```

---

## 3.3 Área de Gestão

Aplicação destinada aos usuários administrativos.

Exemplos:

- administração;
- relatórios;
- cadastros;
- configurações;
- gerenciamento financeiro;
- gerenciamento operacional.

Container sugerido:

```text
web-gestao
```

---

# 4. Regra de Comunicação dos Front-ends

Os front-ends **não devem acessar diretamente as APIs internas**.

Evitar:

```text
web-cliente
     │
     └──────────────> api-pet
```

ou:

```text
web-gestao
     │
     └──────────────> api-financeiro
```

O fluxo externo deve passar pelo ponto de entrada controlado:

```text
Front-end
    │
    ▼
API Gateway
    │
    ▼
API responsável
```

---

# 5. API Gateway / Barramento

O componente chamado internamente de **Barramento** deve ser implementado conceitualmente como um **API Gateway**.

Container sugerido:

```text
api-gateway
```

Sua responsabilidade principal será receber uma requisição e encaminhá-la para o serviço responsável.

Exemplo:

```text
/api/publico/*
        ↓
api-publica

/api/cliente/*
        ↓
api-cliente

/api/gestao/*
        ↓
api-gestao
```

O gateway deve permanecer simples.

Ele não deve concentrar regras de negócio.

## Deve realizar

- roteamento;
- validação básica da requisição;
- autenticação quando aplicável;
- validação de token;
- controle de acesso inicial;
- rate limiting;
- geração/propagação de correlation ID;
- registro de logs;
- encaminhamento da requisição;
- tratamento padronizado de erros.

## Não deve realizar

- cálculos financeiros;
- regras relacionadas a pets;
- processamento de diagnósticos;
- regras de investimento;
- regras de agenda;
- persistência de regras de negócio;
- consultas diretas ao banco de dados de domínio, salvo necessidade arquitetural expressamente documentada.

---

# 6. APIs de Entrada por Perfil

Podem existir APIs responsáveis por adaptar as necessidades dos diferentes consumidores.

Exemplo:

```text
api-publica
api-cliente
api-gestao
```

Entretanto, essas APIs **não devem substituir a separação por domínio**.

Existe uma diferença conceitual importante:

```text
Público
Cliente
Gestão
```

representam **perfis/contextos de consumo**.

Enquanto:

```text
Pet
Financeiro
Agenda
Diagnóstico
Investimentos
```

representam **domínios de negócio**.

Sempre que possível, manter essa distinção.

---

# 7. APIs de Domínio

As regras de negócio devem permanecer nas APIs responsáveis pelo respectivo domínio.

Exemplo:

```text
api-pet
api-financeiro
api-agenda
api-diagnostico
```

Uma API pode consumir outras APIs internas quando necessário.

Exemplo:

```text
api-financeiro
      │
      ├──> api-renda
      ├──> api-gastos
      └──> api-investimentos
```

Nesse cenário, `api-financeiro` pode funcionar como serviço de composição/orquestração.

---

# 8. Regra de Dependência

Evitar dependências indiscriminadas entre serviços.

Cada API deve possuir uma lista explícita dos serviços que pode acessar.

Exemplo:

```text
api-financeiro
    ├── api-renda
    ├── api-gastos
    └── api-investimentos
```

Isso **não significa** que:

```text
api-renda
```

automaticamente possa acessar:

```text
api-pet
api-agenda
api-diagnostico
```

Cada comunicação deve existir porque há uma necessidade funcional documentada.

---

# 9. Segmentação de Rede

Os containers não devem permanecer indiscriminadamente na mesma network.

Criar redes de acordo com as responsabilidades.

Exemplo conceitual:

```text
network_public
network_front
network_gateway
network_services
network_database
```

---

# 10. Fluxo Permitido

O fluxo esperado deve seguir aproximadamente:

```text
Internet
   │
   ▼
Reverse Proxy
   │
   ▼
Front / Gateway
   │
   ▼
API Gateway
   │
   ▼
APIs
   │
   ▼
Banco
```

Não permitir caminhos desnecessários.

Exemplo:

```text
Internet ─────────── X ─────> PostgreSQL

Front ────────────── X ─────> PostgreSQL

Front ────────────── X ─────> API interna

API Pet ──────────── X ─────> serviços sem relação com Pet
```

---

# 11. Banco de Dados

O PostgreSQL deve seguir o princípio do **menor privilégio**.

Não utilizar uma única credencial administrativa compartilhada entre todas as APIs.

Evitar:

```text
DB_USERNAME=postgres
DB_PASSWORD=...
```

em todas as aplicações.

Cada aplicação deve possuir uma credencial própria.

Exemplo:

```text
api-pet
    ↓
app_pet
```

```text
api-financeiro
    ↓
app_financeiro
```

```text
api-publica
    ↓
app_publico_ro
```

---

# 12. Separação por Schema

Sempre que adequado ao domínio, organizar o PostgreSQL utilizando schemas.

Exemplo:

```text
publico.*
pet.*
financeiro.*
agenda.*
identidade.*
assinaturas.*
```

Isso permite aplicar permissões de maneira mais organizada.

Exemplo:

```sql
GRANT USAGE ON SCHEMA pet TO app_pet;
```

E:

```sql
GRANT SELECT, INSERT, UPDATE
ON ALL TABLES IN SCHEMA pet
TO app_pet;
```

Ao mesmo tempo:

```sql
REVOKE ALL
ON SCHEMA financeiro
FROM app_pet;
```

---

# 13. Usuários de Banco

Preferir inicialmente **um usuário de banco por serviço ou contexto de acesso**, em vez de um usuário por tabela.

Exemplo:

| Serviço | Usuário |
|---|---|
| API Pública | `app_publico_ro` |
| API Pet | `app_pet` |
| API Financeiro | `app_financeiro` |
| API Gestão | `app_gestao` |
| API Administrativa | `app_admin` |

As permissões devem ser concedidas explicitamente.

---

# 14. APIs Somente Leitura

Quando uma API não precisar modificar dados, sua credencial deve possuir apenas:

```text
SELECT
```

Exemplo:

```text
api-publica
      │
      ▼
app_publico_ro
      │
      └── SELECT
```

Mesmo que a aplicação seja comprometida, a credencial não deverá permitir:

```text
INSERT
UPDATE
DELETE
TRUNCATE
DROP
ALTER
CREATE
```

---

# 15. APIs de Escrita

Apenas serviços que realmente precisam alterar determinada informação devem possuir privilégios de escrita.

Exemplo:

```text
api-pet
    ↓
app_pet
    ↓
SELECT
INSERT
UPDATE
```

Se a API não possuir funcionalidade de exclusão, não conceder:

```text
DELETE
```

O privilégio deve refletir as operações reais da aplicação.

---

# 16. Separação Administrativa

Operações administrativas críticas podem possuir serviço separado.

Exemplo:

```text
api-financeiro
       ↓
somente leitura/operações normais
```

e:

```text
api-financeiro-admin
       ↓
operações administrativas
```

Isso deve ser adotado quando a separação trouxer benefício real de segurança, auditoria ou governança.

Não criar serviços adicionais apenas para aumentar artificialmente a complexidade.

---

# 17. Credenciais

Nenhuma credencial deve permanecer diretamente no código-fonte.

Proibido:

```php
$password = "senha123";
```

ou:

```text
DB_PASSWORD=senha123
```

versionado no Git.

Utilizar:

- variáveis de ambiente;
- Docker Secrets;
- secret managers;
- soluções equivalentes disponíveis na infraestrutura.

O repositório deve conter somente exemplos:

```text
.env.example
```

Nunca:

```text
.env
```

com credenciais reais.

---

# 18. Autenticação e Autorização

Não confundir:

```text
Autenticação
```

com:

```text
Autorização
```

Autenticação responde:

> Quem é o usuário?

Autorização responde:

> O que esse usuário pode fazer?

Mesmo que o usuário esteja autenticado, cada serviço deve validar se ele possui autorização para realizar a operação solicitada.

---

# 19. Segurança não deve depender de obscuridade

Não considerar nomes internos como mecanismo de segurança.

Por exemplo:

```text
api-x7f93-financeiro
```

não é necessariamente mais segura que:

```text
api-financeiro
```

O atacante deve poder conhecer teoricamente toda a arquitetura sem que isso comprometa a segurança.

A proteção deve estar baseada em:

- autenticação;
- autorização;
- firewall;
- segmentação;
- networks;
- privilégios;
- criptografia;
- secrets;
- validação;
- auditoria;
- monitoramento.

---

# 20. Defense in Depth

Toda implementação deve considerar **Defesa em Profundidade**.

```text
Camada 1
Reverse Proxy / WAF

        ↓

Camada 2
Front-ends separados

        ↓

Camada 3
API Gateway

        ↓

Camada 4
Autenticação e autorização

        ↓

Camada 5
Segmentação de rede

        ↓

Camada 6
APIs por domínio

        ↓

Camada 7
Credenciais por serviço

        ↓

Camada 8
Permissões PostgreSQL

        ↓

Camada 9
Logs / auditoria

        ↓

Camada 10
Monitoramento
```

O comprometimento de uma camada não deve automaticamente comprometer as demais.

---

# 21. Princípio do Menor Privilégio

Aplicar **Least Privilege** em toda a arquitetura.

Cada componente deve possuir:

> somente os acessos estritamente necessários para executar sua responsabilidade.

Isso vale para:

- usuários;
- containers;
- APIs;
- banco;
- schemas;
- tabelas;
- networks;
- volumes;
- arquivos;
- secrets;
- filas;
- caches;
- serviços externos.

---

# 22. Zero Trust

Não confiar automaticamente em uma requisição apenas porque ela veio de outro container ou da rede interna.

Uma chamada:

```text
api-financeiro
       ↓
api-investimentos
```

deve possuir mecanismos que permitam verificar a legitimidade da comunicação quando o nível de risco justificar.

A rede interna não deve ser considerada automaticamente confiável.

---

# 23. Auditoria

Toda operação relevante deve possuir capacidade de rastreamento.

Registrar, quando aplicável:

```text
timestamp
request_id
correlation_id
usuario
servico_origem
servico_destino
endpoint
metodo
resultado
status_http
duracao
ip_origem
```

Nunca registrar em logs:

- senha;
- token completo;
- secret;
- chave privada;
- dados sensíveis desnecessários.

---

# 24. Correlation ID

Cada requisição deve possuir um identificador que possa acompanhá-la entre os serviços.

Exemplo:

```text
Request: 8b2f-9832-11
```

Fluxo:

```text
Gateway
  │
  │ correlation_id=8b2f-9832-11
  ▼
API Financeiro
  │
  │ correlation_id=8b2f-9832-11
  ▼
API Investimentos
```

Isso permitirá reconstruir o caminho da requisição durante auditorias e diagnóstico de problemas.

---

# 25. Containers

Cada container deve executar somente os processos necessários para sua responsabilidade.

Evitar containers contendo simultaneamente:

```text
Nginx
PHP
PostgreSQL
Redis
Workers
Cron
outros serviços
```

sem necessidade arquitetural.

Preferir responsabilidades isoladas.

---

# 26. Containers sem privilégios

Sempre que possível:

- executar processos como usuário não-root;
- utilizar filesystem somente leitura quando possível;
- remover capabilities desnecessárias;
- limitar CPU;
- limitar memória;
- restringir volumes;
- restringir portas;
- não utilizar `--privileged`;
- não expor Docker Socket.

---

# 27. Portas

Não publicar portas internas sem necessidade.

Evitar:

```yaml
ports:
  - "5432:5432"
```

para PostgreSQL em produção quando somente containers internos precisam acessá-lo.

Preferir comunicação pelas networks privadas.

O mesmo princípio deve ser aplicado a:

- Redis;
- Meilisearch;
- APIs internas;
- filas;
- serviços auxiliares.

---

# 28. Escalabilidade

A arquitetura deve permitir escalar componentes independentemente.

Exemplo:

```text
                Gateway
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Pet #1   Pet #2   Pet #3
```

Um aumento de utilização do módulo Pet não deve obrigar a replicar toda a plataforma.

---

# 29. Não criar microserviços sem necessidade

Separação arquitetural não significa transformar cada função em um serviço.

Evitar:

```text
api-cadastrar-pet
api-editar-pet
api-excluir-pet
api-listar-pet
```

Preferir:

```text
api-pet
```

contendo as responsabilidades coerentes do domínio Pet.

Separar novamente somente quando houver justificativa arquitetural.

---

# 30. Critérios para Separar um Serviço

Considerar a criação de um serviço independente quando existir uma ou mais necessidades como:

- domínio claramente diferente;
- ciclo de vida independente;
- equipe responsável diferente;
- necessidade específica de escalabilidade;
- requisito específico de segurança;
- tecnologia diferente;
- necessidade de isolamento;
- volume de processamento muito diferente;
- necessidade independente de deploy.

---

# 31. Ordem Recomendada de Implementação

O assistente de IA deve priorizar a implementação nesta sequência:

## Etapa 1 — Infraestrutura

- [ ] Definir containers.
- [ ] Definir networks.
- [ ] Definir volumes.
- [ ] Definir reverse proxy.
- [ ] Definir regras de comunicação.
- [ ] Definir secrets.

## Etapa 2 — Banco

- [ ] Criar schemas.
- [ ] Criar usuários.
- [ ] Definir grants.
- [ ] Remover privilégios desnecessários.
- [ ] Criar migrations.

## Etapa 3 — Gateway

- [ ] Criar roteamento.
- [ ] Criar autenticação.
- [ ] Criar autorização inicial.
- [ ] Criar correlation ID.
- [ ] Criar logs.
- [ ] Criar tratamento de erros.

## Etapa 4 — APIs

- [ ] Implementar APIs por domínio.
- [ ] Configurar credenciais individuais.
- [ ] Configurar comunicação interna.
- [ ] Implementar autorização.
- [ ] Implementar logs.

## Etapa 5 — Front-ends

- [ ] Web pública.
- [ ] Área cliente.
- [ ] Área gestão.
- [ ] Integração exclusivamente pelos endpoints permitidos.

## Etapa 6 — Segurança

- [ ] Revisar portas expostas.
- [ ] Revisar networks.
- [ ] Revisar usuários dos containers.
- [ ] Revisar permissões PostgreSQL.
- [ ] Revisar secrets.
- [ ] Revisar autenticação.
- [ ] Revisar autorização.
- [ ] Revisar logs.

## Etapa 7 — Observabilidade

- [ ] Logs centralizados.
- [ ] Métricas.
- [ ] Health checks.
- [ ] Monitoramento.
- [ ] Alertas.
- [ ] Rastreamento de requisições.

---

# 32. Regra para o Assistente de IA

Antes de criar um novo componente, o assistente deve responder internamente às seguintes perguntas:

1. Qual é a responsabilidade desse componente?
2. A qual domínio ele pertence?
3. Ele realmente precisa ser um serviço separado?
4. Quem pode acessá-lo?
5. Quais serviços ele pode acessar?
6. Qual network ele precisa utilizar?
7. Ele precisa acessar banco?
8. Qual schema precisa acessar?
9. Precisa de `SELECT`?
10. Precisa de `INSERT`?
11. Precisa de `UPDATE`?
12. Precisa de `DELETE`?
13. Quais secrets ele precisa?
14. Quais portas precisam ser expostas?
15. A operação precisa ser auditada?
16. Como essa requisição será rastreada?
17. O que acontece se esse componente for comprometido?

Se uma permissão não puder ser justificada, **não concedê-la por padrão**.

---

# 33. Regra de Segurança Fundamental

Ao implementar qualquer funcionalidade, considerar o cenário:

> **"Considere que o atacante conhece completamente nossa arquitetura."**

Mesmo nesse cenário, o comprometimento de:

```text
web-publica
```

não deve fornecer automaticamente acesso a:

```text
api-pet
PostgreSQL
api-financeiro
api-gestao
```

Da mesma forma, comprometer:

```text
api-pet
```

não deve fornecer automaticamente acesso a:

```text
financeiro.*
identidade.*
assinaturas.*
```

---

# 34. Princípio Final

A arquitetura deve privilegiar:

```text
Separação
     +
Isolamento
     +
Menor privilégio
     +
Autorização
     +
Segmentação
     +
Auditoria
     +
Observabilidade
```

O objetivo não é criar complexidade artificial.

O objetivo é garantir que:

> **cada componente tenha somente o conhecimento, conectividade e privilégios necessários para realizar sua função.**

A arquitetura deve permanecer simples onde a simplicidade for suficiente e aumentar o isolamento somente quando houver ganho concreto em segurança, escalabilidade, governança, disponibilidade ou manutenção.

---

# 35. Diretriz para Evolução

Não implementar toda a complexidade possível antecipadamente.

O assistente deve favorecer evolução incremental:

```text
Arquitetura inicial
       ↓
Separação clara dos domínios
       ↓
Controle de acesso
       ↓
Segmentação
       ↓
Observabilidade
       ↓
Escalabilidade
       ↓
Separação adicional conforme necessidade
```

A plataforma deve estar preparada para crescer sem exigir que toda possibilidade futura seja implementada desde o primeiro momento.

**Regra:** criar uma nova camada ou serviço somente quando ela possuir uma responsabilidade ou benefício arquitetural identificável e documentável.