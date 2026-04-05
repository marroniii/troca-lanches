# Guia de Testes — TrocaLanches

## Estratégia de Testes

Os testes asseguram qualidade, eficiência, segurança e confiabilidade, cobrindo cenários críticos de usabilidade e entrega de valor.

### Princípios
- **Cobertura Completa**: Cenários happy path e edge cases.
- **Automação**: Execução rápida e repetível.
- **Isolamento**: Testes independentes, estado resetado.
- **Validação de Segurança**: Verificação de isolamento de dados.

## Tipos de Testes

### 1. Testes de API (Unitários/Integração)

- **Framework**: Node.js built-in test + Supertest.
- **Cobertura**: 25 cenários em 7 categorias.
- **Tempo**: ~4s.
- **Comando**: `npm run test:api`

#### Categorias e Cenários

| Categoria | Cenários | Objetivo |
|-----------|----------|----------|
| Health | Status da API | Verificar disponibilidade |
| Autenticação | Login, validações, reutilização | Segurança de acesso |
| Segurança | 401 sem/inválido user-id | Isolamento de dados |
| Lanches CRUD | Criar, listar, editar, deletar | Funcionalidade completa |
| Propostas | Interesse, aceitar, fluxo completo | Negociação de trocas |
| Feed | Reações, comentários (participantes) | Interações sociais |
| Validação | Entradas obrigatórias | Robustez |

### 2. Testes E2E (End-to-End)

- **Framework**: Playwright (Chromium).
- **Cobertura**: 7 fluxos de usuário.
- **Tempo**: ~40s.
- **Comando**: `npm run test:e2e`

#### Fluxos Testados

| Fluxo | Descrição | Validação |
|-------|-----------|-----------|
| Configurar perfil | Nome, local, atualização UI | Usabilidade |
| Cadastrar lanche | Modal, campos, listagem | CRUD básico |
| Propostas | Carregamento de lista | Navegação |
| Perfil para trocar | Redirecionamento | UX |
| Feed | Exibição de trocas | Estado vazio/itens |
| Navegação | Alternar abas | Responsividade |
| Modal cancelar | Fechar sem salvar | Prevenção de erros |

## Execução

### Pré-requisitos
- Node.js 18+
- Dependências: `npm install`
- Browsers (E2E): `npx playwright install`

### Comandos
```bash
# API
npm run test:api

# E2E (requer backend rodando)
npm run start:backend  # Em outro terminal
npm run test:e2e
```

### Resultados Recentes
- **API**: 25/25 passando (100% sucesso).
- **E2E**: 7/7 passando (100% sucesso).

## Análise de Qualidade

### Métricas
- **Cobertura**: Cenários críticos (segurança, fluxos principais).
- **Velocidade**: API rápida (~4s), E2E moderada (~40s).
- **Confiabilidade**: Zero falhas em execuções recentes.

### Pontos Fortes
- **Segurança**: Testes de isolamento (dono só edita seus lanches).
- **Usabilidade**: Fluxos E2E simulam usuário real.
- **Manutenibilidade**: Código de teste limpo, assertivos claros.

### Melhorias Futuras
- **Cobertura de Código**: Adicionar Istanbul para % de linhas.
- **Testes de Performance**: Carga com Artillery.
- **Acessibilidade**: Testes com axe-playwright.
- **Integração Contínua**: GitHub Actions para automação.

## Debugging de Falhas

### API
- Verificar logs do servidor.
- Usar `--verbose` para detalhes.

### E2E
- Screenshots em `test-results/` para falhas.
- Verificar se backend está rodando na porta 3000.

## Conclusão

A suíte de testes garante que o TrocaLanches atende aos requisitos de qualidade, com foco em segurança e usabilidade. Para evolução, expandir cobertura e adicionar testes de performance.
