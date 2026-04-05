# Guia de Uso Completo — TrocaLanches

## Introdução

O TrocaLanches é uma plataforma web para troca de lanches entre pessoas. Este guia cobre desde o primeiro acesso até funcionalidades avançadas.

## Primeiro Acesso

1. Abra `index.html` em um navegador moderno.
2. Na primeira vez, o app carrega dados de demonstração.
3. Configure seu perfil para começar a usar.

## Configuração de Perfil

1. Clique na aba **Perfil**.
2. Preencha:
   - **Nome**: Seu nome completo.
   - **Local**: Onde você trabalha (ex: Hamburgueria, Pizzaria).
3. Clique **Salvar perfil**.
4. O header será atualizado com seu nome.

**Nota**: Sem perfil, você não pode demonstrar interesse ou interagir no feed.

## Gerenciamento de Lanches

### Cadastrar Lanche

1. Na aba **Perfil**, clique **Adicionar lanche**.
2. Preencha:
   - **Foto**: Upload de arquivo ou URL.
   - **Nome**: Nome do lanche (obrigatório).
   - **Descrição**: Ingredientes ou detalhes.
3. Clique **Salvar lanche**.
4. O lanche aparece na lista e uma proposta é criada automaticamente.

### Editar/Remover Lanche

- Clique no lanche na lista.
- Edite campos e salve, ou clique **Remover**.

**Segurança**: Apenas o dono pode editar/remover.

## Propostas de Troca

### Visualizar Propostas

1. Clique na aba **Propostas**.
2. Veja lista de propostas abertas de outros usuários.

### Demonstrar Interesse

1. Em uma proposta, clique **✓ Tenho interesse**.
2. Escolha forma de entrega:
   - 🛵 Motoboy
   - 🚶 Deslocamento
3. (Opcional) Adicione mensagem.
4. Clique **✓ Confirmar interesse**.

### Responder Interessados (Dono)

1. Se sua proposta tem interessados, clique **“N interesse(s) — responder”**.
2. Para cada um:
   - **✓ Aceitar troca**: Move para Feed.
   - **Recusar**: Remove da lista.

## Feed de Trocas

### Visualizar Trocas

1. Clique na aba **Feed**.
2. Veja trocas concluídas.

### Interagir

- **Reações**: Clique em emojis (😍, 👏, 🔥, 😋) — requer perfil.
- **Comentários**:
  - Apenas participantes podem comentar.
  - Digite e pressione Enter ou clique **Enviar**.

### Notificações

- Badge no menu **Feed** indica novidades (comentários de outros em suas trocas).

## Limpeza de Dados

Para resetar:

1. Abra DevTools (F12).
2. Application → Local Storage → Remova chave `tl4`.
3. Recarregue a página.

## Solução de Problemas

### Erro de Conexão
- Certifique-se de que o backend está rodando (`npm run start:backend`).
- Verifique console do navegador para erros.

### Dados Não Salvam
- Verifique se há espaço em localStorage.
- Limpe dados do site.

### Testes Não Passam
- Execute `npm install` para atualizar dependências.
- Para E2E, instale browsers: `npx playwright install`.

## Funcionalidades Avançadas

- **Mensagens em Interesse**: Adicione notas ao demonstrar interesse.
- **Fotos Grandes**: Limite de 50MB por imagem.
- **Navegação**: Use abas para alternar telas.

## Limitações

- Dados locais: Não sincroniza entre dispositivos.
- Sem autenticação real: Baseado em header simples.
- Estado volátil: Dados perdidos ao reiniciar servidor.

Para produção, considere melhorias em persistência e segurança.

