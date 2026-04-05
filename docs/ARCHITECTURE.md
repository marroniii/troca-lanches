# Arquitetura do TrocaLanches

## Visão Geral

O TrocaLanches é uma aplicação web full-stack para facilitar trocas de lanches entre usuários. A arquitetura atual é simples e focada em desenvolvimento rápido, mas com potencial para escalabilidade.

## Componentes da Arquitetura

### 1. Frontend (Cliente)

- **Tecnologia**: JavaScript vanilla, HTML5, CSS3.
- **Arquitetura**: Single Page Application (SPA) com roteamento baseado em estados.
- **Estado**: Gerenciado centralmente em objeto `D`, sincronizado com localStorage e backend.
- **Persistência Local**: localStorage para perfil e dados offline.
- **Interação com Backend**: Fetch API para chamadas REST.

#### Estrutura de Arquivos
- `index.html`: Estrutura da página.
- `app.js`: Lógica de UI, estado, renderização.
- `styles.css`: Estilos responsivos.

#### Fluxo de Usuário
1. Carregamento inicial: Verifica perfil local, carrega dados do backend.
2. Navegação: Alterna entre telas (Perfil, Propostas, Feed).
3. Ações: CRUD de lanches, interesse em propostas, interações no feed.

### 2. Backend (Servidor)

- **Tecnologia**: Node.js com Express.js.
- **Arquitetura**: API RESTful monolítica.
- **Estado**: Em memória (arrays para usuários, lanches, propostas, trocas).
- **Autenticação**: Simples via header `x-user-id`, sem sessões.
- **Segurança**: Middleware de auth, validação básica.

#### Estrutura de Arquivos
- `backend/server.js`: Servidor Express, rotas, lógica de negócio.

#### Endpoints Principais
- `POST /auth/login`: Cria/reutiliza usuário.
- `GET/POST/PUT/DELETE /lanches`: CRUD de lanches.
- `GET /propostas`: Lista propostas abertas.
- `POST /propostas/:id/interesse`: Registra interesse.
- `POST /propostas/:id/aceitar`: Aceita troca.
- `GET /feed`: Lista trocas concluídas.
- `POST /feed/:id/reagir`: Adiciona reação.
- `POST /feed/:id/comentar`: Adiciona comentário.

### 3. Testes

- **API**: Node.js built-in test (assert), supertest para HTTP.
- **E2E**: Playwright para simulação de navegador.
- **Cobertura**: Cenários críticos de usabilidade, segurança e funcionalidade.

## Diagramas

### Fluxo de Dados Geral

```
Usuário → Frontend (UI) → Backend (API) → Estado em Memória
       ↗              ↗
LocalStorage     Sincronização
```

### Arquitetura de Camadas

```
[Frontend SPA]
    ↓ (HTTP)
[Backend API]
    ↓ (In-Memory)
[Estado Temporário]
```

## Avaliação de Qualidade

### Pontos Fortes
- **Simplicidade**: Arquitetura minimalista, fácil de entender e modificar.
- **Testabilidade**: Cobertura alta com testes automatizados.
- **Usabilidade**: Foco em UX, fluxos intuitivos.
- **Segurança Básica**: Isolamento de dados por usuário, validações.

### Áreas de Melhoria
- **Persistência**: Estado volátil; migrar para BD (ex: PostgreSQL).
- **Escalabilidade**: Sem suporte a múltiplas instâncias; adicionar cache (Redis).
- **Segurança**: Autenticação fraca; implementar JWT, rate limiting.
- **Performance**: Sem otimização; adicionar compressão, CDN.
- **Monitoramento**: Sem logs/metrics; integrar Winston, Sentry.
- **Manutenibilidade**: Código monolítico; separar em módulos (controllers, services).

## Recomendações para Evolução

### Fase 1: Persistência
- Adicionar MongoDB/PostgreSQL.
- Migrar estado para BD.

### Fase 2: Segurança e Autenticação
- Implementar JWT.
- Adicionar registro/login real.

### Fase 3: Escalabilidade
- Containerização com Docker.
- Deploy em nuvem (Heroku, AWS).

### Fase 4: Melhorias Avançadas
- Frontend: Migrar para React.
- Backend: Separar em microserviços.
- Adicionar notificações push, geolocalização.

## Dependências e Tecnologias

- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Testes**: Playwright, Supertest
- **Outros**: CORS, Cross-env

## Conclusão

A arquitetura atual atende bem às necessidades iniciais, com foco em qualidade e eficiência. Para atender demandas de mercado maiores (usuários simultâneos, persistência real), é necessário evoluir para uma arquitetura mais robusta, mantendo os princípios de engenharia de software.