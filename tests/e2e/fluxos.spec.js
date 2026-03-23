/**
 * Testes E2E — TrocaLanches
 * Validam usabilidade e que o app entrega o que promete.
 */
const { test, expect } = require('@playwright/test');

test.describe('TrocaLanches — Fluxos principais', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    // Limpa localStorage para começar limpo (evita estado de sessões anteriores)
    await page.evaluate(() => {
      localStorage.removeItem('tl_user');
    });
  });

  test('1. Configurar perfil — nome e local', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await page.click('button:has-text("Perfil")');
    await expect(page.locator('#screen-perfil')).toBeVisible();
    await page.fill('#inp-nome', 'Testador E2E');
    await page.selectOption('#inp-local', 'Hamburgueria');
    await page.click('button:has-text("Salvar perfil")');
    await expect(page.locator('#h-nm')).toContainText('Testador', { timeout: 5000 });
  });

  test('2. Cadastrar lanche — nome, descrição', async ({ page }) => {
    await page.click('button:has-text("Perfil")');
    await page.fill('#inp-nome', 'Usuario Lanche');
    await page.selectOption('#inp-local', 'Pizzaria');
    await page.click('button:has-text("Salvar perfil")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Adicionar lanche")');
    await page.fill('#ml-nome', 'Pizza Margherita');
    await page.fill('#ml-desc', 'Molho, mussarela e manjericão');
    await page.locator('#modal-lanche button:has-text("Salvar lanche")').click();
    await expect(page.locator('text=Erro').or(page.locator('.lanche-edit-name'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.lanche-edit-name:has-text("Pizza Margherita")')).toBeVisible({ timeout: 3000 });
  });

  test('3. Propostas — ver lista (pode estar vazia)', async ({ page }) => {
    await page.click('button:has-text("Propostas")');
    await expect(page.locator('#screen-propostas')).toBeVisible();
    const content = await page.textContent('#lista-propostas');
    expect(content).toBeDefined();
    const vazio = content.includes('Nenhuma proposta aberta') || content.includes('Cadastre');
    const comItens = content.length > 20 && /[A-Za-záéíóú]{3,}/.test(content);
    expect(vazio || comItens).toBeTruthy();
  });

  test('4. Perfil — configuração para trocar', async ({ page }) => {
    await page.click('button:has-text("Propostas")');
    const btn = page.locator('button:has-text("Configure seu perfil para trocar")');
    if (await btn.isVisible()) {
      await btn.click();
      await expect(page.locator('#screen-perfil')).toBeVisible();
    }
  });

  test('5. Feed — exibe trocas concluídas ou estado vazio', async ({ page }) => {
    await page.click('button:has-text("Feed")');
    await expect(page.locator('#screen-feed')).toBeVisible();
    const content = await page.textContent('#lista-feed');
    expect(content).toBeDefined();
    expect(
      content.includes('Nenhuma troca concluída') || content.includes('feed-card')
    ).toBeTruthy();
  });

  test('6. Navegação entre abas', async ({ page }) => {
    await page.click('button:has-text("Propostas")');
    await expect(page.locator('#screen-propostas.active')).toBeVisible();
    await page.click('button:has-text("Feed")');
    await expect(page.locator('#screen-feed.active')).toBeVisible();
    await page.click('button:has-text("Perfil")');
    await expect(page.locator('#screen-perfil.active')).toBeVisible();
  });

  test('7. Modal lanche — cancelar fecha sem salvar', async ({ page }) => {
    await page.click('button:has-text("Perfil")');
    await page.fill('#inp-nome', 'Temp');
    await page.selectOption('#inp-local', 'Outro');
    await page.click('button:has-text("Salvar perfil")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Adicionar lanche")');
    await expect(page.locator('#modal-lanche.open')).toBeVisible();
    await page.fill('#ml-nome', 'Não salvar');
    await page.locator('#modal-lanche button:has-text("Cancelar")').click();
    await expect(page.locator('#modal-lanche.open')).not.toBeVisible();
    await expect(page.locator('text=Não salvar')).not.toBeVisible();
  });
});
