# TrocaLanches

Aplicação **100% front-end** (arquivo `.html` único) para **troca de lanches** entre pessoas. Não há servidor: os dados ficam salvos no navegador via **localStorage**.

## Como executar

- **Opção simples**: abra o arquivo `trocalanches (1).html` no navegador (duplo clique).
- **Opção recomendada (dev)**: use um servidor local (ex.: extensão “Live Server” no VS Code/Cursor) para evitar limitações de alguns navegadores ao carregar recursos locais.

## Funcionalidades

- **Perfil**
  - Salvar **nome** e **local de trabalho**.
  - Cadastrar **lanches** (nome, descrição e **foto** por upload ou URL).
  - Editar/remover lanches cadastrados.

- **Propostas**
  - Lista de **propostas abertas** (inclui dados demo no primeiro uso).
  - Quem vê uma proposta pode **demonstrar interesse** e escolher **forma de entrega**:
    - 🛵 Motoboy
    - 🚶 Deslocamento
  - Dono da proposta pode **ver interessados**, **aceitar troca** ou **recusar**.

- **Feed**
  - Trocas aceitas vão para o feed como “trocas concluídas”.
  - Qualquer pessoa pode **reagir** (após configurar o perfil).
  - **Comentários**: apenas participantes da troca podem comentar.
  - Badge no menu do Feed com “novidades” para participantes (quando há comentários de outras pessoas em trocas das quais você participou).

## Persistência de dados (importante)

- Tudo é salvo no **localStorage** do navegador, na chave **`tl4`**.
- Para “zerar” a aplicação:
  - Abra o DevTools do navegador → Application/Storage → Local Storage → remova a chave `tl4`
  - ou limpe os dados do site.

## Estrutura do projeto

Este projeto está atualmente em **um único arquivo**:

- `trocalanches (1).html`: HTML + CSS + JavaScript (UI, estado, renderização e persistência).

Documentos:

- `docs/USO.md`: guia rápido de uso e fluxos.

## Testes

O projeto possui testes que garantem **usabilidade**, **segurança** e que o app **entrega o que promete**:

### Testes de API (25 cenários)

- Health, autenticação, validações
- CRUD de lanches com verificação de dono (segurança)
- Fluxo completo: proposta → interesse → aceitar → feed
- Reações e comentários (apenas participantes comentam)
- Validação de entrada

```bash
npm test
# ou
npm run test:api
```

### Testes E2E (7 fluxos de usuário)

- Configurar perfil
- Cadastrar lanche
- Ver propostas e feed
- Navegação entre abas
- Modal lanche (cancelar)

```bash
npm run test:e2e
```

> **Nota**: Os testes E2E iniciam o backend automaticamente e usam Chromium. Instale os browsers com `npx playwright install` na primeira vez.

## Publicação (sem backend)

Como é estático, dá para publicar em:

- GitHub Pages
- Netlify
- Vercel

Basta hospedar o arquivo `.html` (e quaisquer assets adicionais, se forem criados no futuro).

