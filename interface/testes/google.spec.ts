import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// O SDK e a credencial são controlados neste arquivo. A validação criptográfica real
// com chaves locais e PostgreSQL está em testes/google.test.ts; não é login Google real.
const sdk = `window.google={accounts:{id:{initialize(options){this.options=options},renderButton(element,options){const b=document.createElement('button');b.textContent='Continuar com Google';b.type='button';b.style.width=options.width+'px';b.onclick=()=>this.options.callback({credential:'credential-controlada-'+this.options.nonce});element.replaceChildren(b)}}}};`;
async function setup(page: Page, failSdk = false) {
  let challenges = 0;
  await page.route("**/api/auth/metodos", route => route.fulfill({ json: { google: { habilitado: true, clientId: "teste.apps.googleusercontent.com" } } }));
  await page.route("**/api/auth/google/desafio", route => route.fulfill({ json: { desafioId: "de000000-0000-4000-8000-000900000001", nonce: `nonce-${++challenges}`, expiraEm: new Date(Date.now() + 300_000).toISOString() } }));
  await page.route("https://accounts.google.com/gsi/client", route => failSdk ? route.abort() : route.fulfill({ contentType: "text/javascript", body: sdk }));
  return { recover: () => { failSdk = false; }, challenges: () => challenges };
}
test("Google conecta a sessão em memória pelo callback e consulta /me", async ({ page, request }) => {
  const session = await (await request.post("http://127.0.0.1:3405/api/auth/login", { data: { email: "ana@integracao.rephouse.test", senha: "Senha-interface-teste-2026" } })).json();
  await setup(page);
  let calls = 0;
  await page.route("**/api/auth/google", route => {
    calls++;
    expect(route.request().postDataJSON().credential).toBe("credential-controlada-nonce-1");
    return route.fulfill({ json: session });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta." })).toBeVisible();
});
test("vinculação pede senha uma vez, permite corrigir erro e cancelar sem repetir login", async ({ page }) => {
  const state = await setup(page);
  let calls = 0;
  await page.route("**/api/auth/google", route => {
    calls++;
    const input = route.request().postDataJSON();
    return route.fulfill({ status: input.senha ? 401 : 409, headers: { "X-Request-Id": "confirmacao-controlada" }, json: { error: { code: input.senha ? "GOOGLE_INVALID_CREDENTIAL" : "GOOGLE_LINK_REQUIRED", message: input.senha ? "A confirmação Google é inválida ou expirou." : "Confirme sua senha atual." } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  const form = page.getByRole("form", { name: "Conectar conta Google" });
  await expect(form).toContainText("manter seu histórico");
  await page.getByLabel("Senha atual", { exact: true }).fill("Senha-incorreta-2026!");
  await page.getByRole("button", { name: "Conectar Google", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("inválida ou expirou");
  await expect(page.getByRole("alert")).toContainText("confirmacao-controlada");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  expect(calls).toBe(2); expect(state.challenges()).toBe(2);
});
test("falha de carregamento do SDK oferece nova tentativa e mantém senha disponível", async ({ page }) => {
  const state = await setup(page, true);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar o Google");
  await expect(page.getByRole("button", { name: "Entrar na minha conta" })).toBeEnabled();
  state.recover();
  await page.getByRole("button", { name: "Tentar Google novamente" }).click();
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
});
test("senha correta conecta a conta existente e preserva a sessão do mesmo usuário", async ({ page, request }) => {
  const session = await (await request.post("http://127.0.0.1:3405/api/auth/login", { data: { email: "bruno@integracao.rephouse.test", senha: "Senha-interface-teste-2026" } })).json();
  await setup(page);
  const attempts: unknown[] = [];
  await page.route("**/api/auth/google", route => {
    const body = route.request().postDataJSON(); attempts.push(body);
    return body.senha ? route.fulfill({ json: session }) : route.fulfill({ status: 409, json: { error: { code: "GOOGLE_LINK_REQUIRED", message: "Confirme a senha atual." } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("Senha-interface-teste-2026");
  await page.getByRole("button", { name: "Conectar Google", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
test("indisponibilidade do provedor não repete login automaticamente", async ({ page }) => {
  await setup(page);
  let calls = 0;
  await page.route("**/api/auth/google", route => {
    calls++;
    return route.fulfill({ status: 503, headers: { "X-Request-Id": "google-indisponivel" }, json: { error: { code: "GOOGLE_UNAVAILABLE", message: "O Google está indisponível." } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Google está indisponível");
  await page.getByRole("button", { name: "Tentar Google novamente" }).click();
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  expect(calls).toBe(1);
});
test("configuração ausente oculta Google sem carregar o SDK", async ({ page }) => {
  let sdkRequests = 0;
  page.on("request", request => { if (request.url().includes("accounts.google.com")) sdkRequests++; });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta." })).toBeVisible();
  await expect(page.getByRole("region", { name: "Acesso Google" })).toHaveCount(0);
  expect(sdkRequests).toBe(0);
});
test("botão Google acompanha a largura ao mudar do computador para o celular", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Continuar com Google" });
  await expect(button).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(async () => (await button.boundingBox())?.width).toBeLessThanOrEqual(272);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
test("login e cadastro em 320, 390, 768 e 1440 px mantêm campos, foco e rolagem", async ({ page }) => {
  await mkdir("../.devops-local/interface/imagens/painel-original-restaurado", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const mode of ["login", "cadastro"]) {
      if (mode === "cadastro") await page.getByRole("button", { name: "Criar conta", exact: true }).click();
      await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
      await page.getByLabel("E-mail", { exact: true }).focus();
      await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Mostrar senha", exact: true })).toBeFocused();
      await page.keyboard.press("Space");
      await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
      await page.keyboard.press("Space");
      const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, width: innerWidth, input: document.querySelector('input[type="email"]')!.getBoundingClientRect().height, panel: document.querySelector(".auth-story")!.getBoundingClientRect().width }));
      expect(dimensions.page).toBeLessThanOrEqual(dimensions.width);
      expect(dimensions.input).toBeGreaterThanOrEqual(54);
      if (width < 900) expect(dimensions.panel).toBe(0);
      else expect(dimensions.panel / (width - 28)).toBeCloseTo(.46, 2);
      const visibleBrands = page.locator(".auth-page .brand:visible");
      await expect(visibleBrands).toHaveCount(1);
      if (width >= 900) await expect(page.locator(".auth-story > .brand")).toBeVisible();
      else await expect(page.locator(".auth-brand .brand")).toBeVisible();
      await page.screenshot({ path: `../.devops-local/interface/imagens/painel-original-restaurado/auth-${mode}-${width}.png`, fullPage: true });
    }
  }
  // No desktop, o conteúdo habitual deve caber inteiro sem rolagem vazia.
  for (const [width, height] of [[1366, 768], [1536, 864], [1440, 900], [1440, 1000], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    for (const mode of ["login", "cadastro"]) {
      if (mode === "cadastro") await page.getByRole("button", { name: "Criar conta", exact: true }).click();
      const fits = await page.evaluate(() => {
        const panel = document.querySelector(".auth-story")!;
        const house = panel.querySelector(".house-art")!.getBoundingClientRect();
        const footer = panel.querySelector(".auth-story-footer")!.getBoundingClientRect();
        return { page: document.documentElement.scrollHeight, viewport: innerHeight, house: house.height, footer: footer.bottom };
      });
      expect(fits.page).toBeLessThanOrEqual(fits.viewport);
      expect(fits.house).toBeGreaterThan(80);
      expect(fits.footer).toBeLessThanOrEqual(height - 14);
    }
  }
  // A altura reduzida deve gerar rolagem, sem esconder a parte inferior do painel
  // ou os controles de um cadastro com mensagem extensa.
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 500 });
    await page.goto("/");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await page.route("**/api/auth/register", route => route.fulfill({ status: 409, json: { error: { code: "CONFLICT", message: "Este e-mail já possui uma conta. ".repeat(8) } } }));
    await page.getByLabel("Seu nome").fill("Pessoa de teste");
    await page.getByLabel("E-mail", { exact: true }).fill("teste@layout.rephouse.test");
    await page.getByLabel("Senha", { exact: true }).fill("Senha-visual-controlada");
    await page.getByRole("button", { name: "Criar minha conta", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Este e-mail");
    await page.getByRole("button", { name: "Criar minha conta", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Criar minha conta", exact: true })).toBeInViewport();
    if (width >= 900) {
      const story = await page.locator(".auth-story").evaluate(element => {
        const panel = element.getBoundingClientRect();
        const house = element.querySelector(".house-art")!.getBoundingClientRect();
        const footer = element.querySelector(".auth-story-footer")!.getBoundingClientRect();
        return { contains: house.bottom <= panel.bottom && footer.bottom <= panel.bottom, title: element.querySelector("h1")!.textContent };
      });
      expect(story.contains).toBe(true);
      expect(story.title).toContain("Compartilhar");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `../.devops-local/interface/imagens/painel-original-restaurado/cadastro-mensagem-${width}x500.png`, fullPage: true });
  }
});
