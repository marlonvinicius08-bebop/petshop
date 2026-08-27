# Plataforma Petshop

Implementação incremental da arquitetura descrita em `GUIA_IMPLEMENTACAO_ARQUITETURA.md`, com separação entre interfaces, gateway, domínios e banco de dados.

## Arquitetura atual

```text
Internet :8080
     │
reverse-proxy
     ├── web-publica
     ├── web-cliente
     ├── web-gestao
     └── api-gateway
            ├── api-pet ────────── PostgreSQL (schema pet)
            ├── api-agenda ─────── PostgreSQL (schema agenda)
            └── api-financeiro ─── PostgreSQL (schema financeiro)
```

Somente o reverse proxy publica uma porta. Cada domínio possui rede e credencial próprias, e as interfaces acessam exclusivamente as rotas externas do gateway.

## Executar localmente

Requisitos: Node.js 22+, Docker e Docker Compose.

```bash
sh scripts/create-dev-secrets.sh
npm ci
npm test
docker compose up --build
```

Acesse:

- Web pública: <http://localhost:8080/>
- Área do cliente: <http://localhost:8080/cliente/>
- Área de gestão: <http://localhost:8080/gestao/>
- Saúde do gateway: <http://localhost:8080/api/health>

Para desenvolvimento local, gere um token temporário sem armazená-lo no Git:

```bash
node scripts/create-dev-token.js cliente cliente-local
node scripts/create-dev-token.js gestao administrador-local
```

Os tokens duram uma hora. Em um ambiente real, devem ser emitidos por um provedor de identidade e os secrets devem vir do gerenciador de segredos da infraestrutura.

## Rotas iniciais

| Perfil | Método | Rota | Responsabilidade |
|---|---:|---|---|
| Público | GET | `/api/publico/servicos` | Lista serviços ativos |
| Cliente | GET | `/api/cliente/pets` | Lista pets do próprio cliente |
| Cliente | POST | `/api/cliente/pets` | Cadastra um pet |
| Cliente | GET | `/api/cliente/agendamentos` | Lista agendamentos do cliente |
| Cliente | POST | `/api/cliente/agendamentos` | Cria um agendamento |
| Gestão | GET | `/api/gestao/financeiro/resumo` | Consulta resumo financeiro |

## Controles implementados

- autenticação JWT HS256 no gateway e autorização por perfil;
- assinatura HMAC com validade curta entre gateway e APIs internas;
- correlation ID gerado ou propagado em todas as requisições;
- logs estruturados sem conteúdo de tokens ou corpos de requisição;
- rate limiting no proxy e no gateway;
- validação de entrada e consultas SQL parametrizadas;
- usuários PostgreSQL com grants mínimos e sem acesso cruzado entre schemas;
- containers sem root, filesystem somente leitura e capabilities removidas quando aplicável;
- redes isoladas por domínio e banco sem porta publicada;
- health checks e métricas no formato Prometheus em `/metrics` nas redes internas.

## Próximas evoluções

Esta primeira entrega estabelece a fundação funcional. Os próximos incrementos previstos pelo guia são integração com provedor de identidade, migrações versionadas por release, persistência de auditoria, coleta centralizada de logs e métricas, alertas e expansão dos domínios conforme necessidades funcionais documentadas.

