# TrocaLanches

Aplicação web para troca de lanches entre pessoas, composta por um frontend SPA (Single Page Application) e um backend REST API em Node.js/Express.

## Visão Geral

O TrocaLanches permite que usuários cadastrem lanches para troca, demonstrem interesse em propostas de outros usuários, e interajam em um feed de trocas concluídas. O sistema foca em usabilidade, segurança e eficiência, atendendo à demanda por plataformas de compartilhamento comunitário de alimentos.

### Funcionalidades Principais

- **Perfil de Usuário**: Cadastro de nome e local de trabalho.
- **Gerenciamento de Lanches**: CRUD de lanches com foto (upload ou URL).
- **Propostas de Troca**: Lista pública de propostas abertas.
- **Interesse e Negociação**: Demonstração de interesse com opções de entrega e mensagens.
- **Feed de Trocas**: Visualização de trocas concluídas com reações e comentários (apenas participantes).
- **Notificações**: Badge para novidades em trocas participadas.

## Arquitetura

### Componentes

- **Frontend**: SPA em JavaScript vanilla, HTML5 e CSS3. Responsivo, acessível.
- **Backend**: API REST em Node.js/Express, estado atualmente em memória (para desenvolvimento).
- **Persistência**: LocalStorage no frontend; arrays em memória no backend (piloto).
- **Testes**: API unitários/integração com Node.js built-in; E2E com Playwright.

### Fluxo de Dados

1. Usuário configura perfil → Salvo localmente e sincronizado com backend.
2. Cadastro de lanche → Cria proposta aberta automaticamente.
3. Interesse em proposta → Registra com opções de entrega.
4. Aceitação → Move para feed como troca concluída.
5. Interações no feed → Reações públicas, comentários privados para participantes.

### Princípios de Engenharia de Software Aplicados

- **Estrutura**: Separação clara entre frontend (UI) e backend (lógica/API).
- **Organização**: Código modular, funções reutilizáveis.
- **Design**: Padrão RESTful para APIs, estado gerenciado centralmente.
- **Testagem**: Cobertura completa de cenários críticos (25 API + 7 E2E).
- **Documentação**: Guias de uso, testes e arquitetura.
- **Qualidade**: Validação de entrada, isolamento de dados por usuário.
- **Eficiência**: Carregamento assíncrono, minimização de requests.
- **Segurança**: Autenticação obrigatória para ações, isolamento de dados.
- **Confiabilidade**: Tratamento de erros, testes automatizados.
- **Manutenibilidade**: Código comentado, estrutura simples.

## Instalação e Execução

### Pré-requisitos

- Node.js 18+
- Navegador moderno (Chrome recomendado para desenvolvimento)

### Passos

1. Clone o repositório:
   ```bash
   git clone <url-do-repo>
   cd troca-lanches
   ```

2. Instale dependências:
   ```bash
   npm install
   ```

3. Para desenvolvimento (backend + frontend):
   ```bash
   npm run start:backend  # Inicia backend em http://localhost:3000
   # Abra index.html no navegador ou use extensão Live Server
   ```

4. Para testes:
   ```bash
   npm run test:api       # Testes de API (~3s)
   npm run test:e2e       # Testes E2E (~40s, requer backend rodando)
   ```

## Testes

### Estratégia

- **API**: Validação de endpoints, segurança, fluxos completos.
- **E2E**: Simulação de usuário real no navegador.
- Cobertura: 100% dos cenários críticos.

### Resultados Recentes

- API: 25/25 testes passando.
- E2E: 7/7 testes passando.

## Limitações e Melhorias Futuras

### Atual

- Persistência em memória: Dados perdidos ao reiniciar.
- Autenticação simples: Sem JWT ou sessões reais.
- Escalabilidade: Não suporta múltiplos usuários simultâneos.

### Sugestões de Melhoria

- **Banco de Dados**: Migrar para PostgreSQL ou MongoDB.
- **Autenticação**: Implementar JWT, OAuth.
- **Segurança**: Rate limiting, sanitização de entrada, HTTPS.
- **Performance**: Cache, otimização de imagens.
- **Monitoramento**: Logs, métricas com ferramentas como Winston e PM2.
- **Deploy**: Containerização com Docker, CI/CD com GitHub Actions.
- **Frontend**: Migrar para React/Vue para melhor manutenção.
- **Testes**: Adicionar testes de carga, acessibilidade.

## Contribuição

1. Fork o projeto.
2. Crie uma branch para sua feature.
3. Adicione testes para novas funcionalidades.
4. Submeta PR com descrição detalhada.

## Licença

MIT

