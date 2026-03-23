# Guia de testes — TrocaLanches

## Visão geral

Os testes garantem:

1. **Usabilidade** — os fluxos principais funcionam do ponto de vista do usuário  
2. **Segurança** — apenas o dono edita/remove lanches; apenas participantes comentam  
3. **Entrega** — o app faz o que promete no README e no guia de uso  

## Executando os testes

```bash
# Testes de API (rápidos, ~3s)
npm test

# Testes E2E (abre navegador, ~50s)
npm run test:e2e
```

## Cobertura

### API (`tests/api.test.js`)

| Categoria | Cenários |
|-----------|----------|
| Health | GET / retorna status ok |
| Auth | Login, validação nome/local, reutilização de usuário |
| Segurança | 401 sem x-user-id, 401 com user inexistente |
| Lanches | CRUD, isolamento por dono, PUT/DELETE bloqueiam se não for dono |
| Propostas | Lista, interesse, duplicado, aceitar, proposta sai da lista |
| Feed | Lista, reagir, comentar (participante ✓), não-participante ✗ |
| Validação | Nome obrigatório, entrega obrigatória, emoji obrigatório |

### E2E (`tests/e2e/fluxos.spec.js`)

| Fluxo | O que valida |
|-------|--------------|
| Configurar perfil | Nome, local, header atualiza |
| Cadastrar lanche | Modal, campos, lanche aparece na lista |
| Propostas | Tela carrega (vazia ou com itens) |
| Perfil para trocar | Botão leva ao perfil se necessário |
| Feed | Tela carrega (vazia ou com trocas) |
| Navegação | Propostas ↔ Feed ↔ Perfil |
| Modal lanche | Cancelar fecha sem salvar |

## Pré-requisitos

- Node.js 18+
- Para E2E: `npx playwright install` ( Chromium, primeira vez)
