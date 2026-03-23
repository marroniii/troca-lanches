# Guia de uso — TrocaLanches

## 1) Primeiro acesso (dados demo)

Ao abrir a aplicação pela primeira vez, ela carrega **propostas** e **feed** de exemplo para demonstração. Depois disso, tudo passa a ser salvo no seu navegador.

## 2) Configurar perfil

1. Abra a aba **Perfil**.
2. Preencha **Seu nome**.
3. Selecione **Onde você trabalha**.
4. Clique em **Salvar perfil**.

Sem perfil salvo, você não consegue demonstrar interesse, reagir ou comentar.

## 3) Cadastrar um lanche (para aparecer em Propostas)

1. Na aba **Perfil**, clique em **Adicionar lanche**.
2. Preencha:
   - **Foto do lanche** (upload) *ou* **URL de imagem**
   - **Nome do lanche**
   - **Descrição / ingredientes**
3. Clique em **Salvar lanche**.

Após salvar, o sistema sincroniza automaticamente e cria/atualiza uma **proposta aberta** para o seu lanche.

## 4) Demonstrar interesse em uma proposta

1. Vá para **Propostas**.
2. Em uma proposta de outra pessoa, clique em **✓ Tenho interesse**.
3. Escolha a forma de entrega:
   - **🛵 Motoboy**
   - **🚶 Deslocamento**
4. (Opcional) escreva uma mensagem para o dono do lanche.
5. Clique em **✓ Confirmar interesse**.

Depois disso, a proposta fica marcada como “Você demonstrou interesse”.

## 5) Responder interessados (dono da proposta)

Se a proposta é sua e houver interessados:

1. Em **Propostas**, clique em **“N interesse(s) — responder”**.
2. Para cada interessado, escolha:
   - **✓ Aceitar troca** (a troca vai para o **Feed**)
   - **Recusar** (remove o interessado da lista)

Ao aceitar, a proposta é removida de “Propostas” e aparece no **Feed** como troca concluída.

## 6) Interagir no Feed (reações e comentários)

- **Reações**: exigem perfil configurado.
- **Comentários**:
  - Apenas quem participou da troca pode comentar.
  - Você pode enviar pelo botão **Enviar** ou pressionando **Enter** no campo.

## 7) “Novidades” no Feed (badge)

O badge no menu do **Feed** aparece quando:

- você participou da troca (seu nome está em um dos lados), e
- existe comentário de outra pessoa nessa troca.

## 8) Limpar dados (reset)

A aplicação salva dados no **localStorage** do navegador na chave **`tl4`**.

Para resetar:

1. Abra o DevTools do navegador (F12).
2. Vá em Application/Storage → Local Storage.
3. Remova a chave `tl4` (ou limpe os dados do site).
4. Recarregue a página.

## Limitações atuais (por design)

- Não há autenticação, multiusuário real ou sincronização entre dispositivos.
- Os dados são **locais por navegador**.
- Upload de foto vira **data URL** e pode aumentar bastante o tamanho do localStorage.

