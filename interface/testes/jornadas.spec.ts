import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type { components } from "../../integracao/api";

const url = "http://127.0.0.1:3405/api";
const password = "Senha-interface-teste-2026";
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test";
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  const response = page.waitForResponse((res) =>
    res.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  return (await result.json()) as components["schemas"]["Sessao"];
}
async function apiLogin(request: APIRequestContext, user: string) {
  const response = await request.post(`${url}/auth/login`, {
    data: { email: `${user}@integracao.rephouse.test`, senha: password },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as components["schemas"]["Sessao"];
}
async function account(request: APIRequestContext, token: string) {
  const response = await request.get(`${url}/me`, { headers: headers(token) });
  expect(response.status()).toBe(200);
  return (await response.json()) as components["schemas"]["MinhaConta"];
}
async function persisted(sql: string, values: unknown[] = []) {
  const metadata = JSON.parse(
    await readFile(
      new URL("../../.devops-local/interface/ambiente.json", import.meta.url),
      "utf8",
    ),
  ) as { schema: string };
  if (
    !/^integration_test_[a-f0-9]+$/.test(metadata.schema) ||
    new URL(testDatabaseUrl).pathname !== "/rabbu_mvp_test"
  )
    throw new Error("Ambiente de testes inválido.");
  const client = new pg.Client({
    connectionString: testDatabaseUrl,
    options: `-c search_path=${metadata.schema}`,
  });
  await client.connect();
  try {
    return await client.query(sql, values);
  } finally {
    await client.end();
  }
}

test("cadastro, república, tarefas, permissões, transferência, perfil e saída com PostgreSQL real", async ({
  page,
  browser,
  request,
}) => {
  const email = `ana.${randomUUID()}@interface.rephouse.test`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Criar conta", exact: true })
    .click();
  await page.getByLabel("Seu nome").fill("Ana Oliveira");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Conta criada");
  const admin = await login(page, email);
  await expect(page.getByText("Sua república começa por aqui.")).toBeVisible();
  await page.getByRole("button", { name: "Criar minha república" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Nome da república").fill("Casa Girassol");
  await page.getByLabel(/Endereço/).fill("Rua das Flores, 42");
  await page
    .getByRole("button", { name: "Criar república", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Casa Girassol" }),
  ).toBeVisible();
  const adminAccount = await account(request, admin.token);
  const republic = adminAccount.membro!.republica;
  const resident = await apiLogin(request, "bruno");
  expect(
    (
      await request.patch(`${url}/me`, {
        headers: headers(resident.token),
        data: { nome: "Bruno Santos" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`${url}/republicas/entrar`, {
        headers: headers(resident.token),
        data: { codigoEntrada: republic.codigoEntrada },
      })
    ).status(),
  ).toBe(201);
  const residentAccount = await account(request, resident.token);
  await page.getByRole("link", { name: "Tarefas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Uma casa pronta para se organizar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  await page.getByLabel("O que precisa ser feito?").fill("Limpar a cozinha");
  await page
    .getByLabel("Quem fica responsável?")
    .selectOption(residentAccount.membro!.id);
  await page.getByLabel(/Prazo/).fill("2030-01-15");
  await page
    .getByLabel(/Detalhes/)
    .fill("Guardar os utensílios depois de limpar.");
  const created = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/tarefas") && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
  const task = (await (
    await created
  ).json()) as components["schemas"]["Tarefa"];
  await expect(
    page.getByRole("heading", { name: "Limpar a cozinha" }),
  ).toBeVisible();
  await expect(page.getByText("15/01/2030")).toBeVisible();
  expect(
    (
      await persisted(
        "SELECT status, responsavel_id FROM tarefas WHERE id=$1",
        [task.id],
      )
    ).rows[0],
  ).toEqual({ status: "ABERTA", responsavel_id: residentAccount.membro!.id });

  const otherContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const otherPage = await otherContext.newPage();
  try {
    await otherPage.goto("http://127.0.0.1:5174");
    await otherPage
      .getByLabel("E-mail", { exact: true })
      .fill("bruno@integracao.rephouse.test");
    await otherPage.getByLabel("Senha", { exact: true }).fill(password);
    await otherPage
      .getByRole("button", { name: "Entrar na minha conta" })
      .click();
    await otherPage.getByRole("link", { name: "Tarefas", exact: true }).click();
    await expect(
      otherPage.getByRole("button", { name: "Nova tarefa", exact: true }),
    ).toHaveCount(0);
    await otherPage
      .getByRole("button", { name: "Concluir: Limpar a cozinha" })
      .click();
    await expect(
      otherPage.locator(".task-row").filter({ hasText: "Limpar a cozinha" }),
    ).toContainText("Concluída");
    expect(
      (await persisted("SELECT status FROM tarefas WHERE id=$1", [task.id]))
        .rows[0].status,
    ).toBe("CONCLUIDA");

    await page.getByRole("link", { name: "Moradores", exact: true }).click();
    await page
      .locator(".member-card")
      .filter({ hasText: "Bruno Santos" })
      .getByRole("button", { name: "Transferir administração" })
      .click();
    await page.getByRole("button", { name: "Confirmar transferência" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Tarefas", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Nova tarefa", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await request.post(`${url}/tarefas`, {
          headers: headers(admin.token),
          data: {
            titulo: "Não permitida",
            responsavelId: adminAccount.membro!.id,
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await persisted("SELECT admin_id FROM republicas WHERE id=$1", [
          republic.id,
        ])
      ).rows[0].admin_id,
    ).toBe(resident.usuario.id);
    await otherPage
      .getByRole("button", { name: "Atualizar meu vínculo" })
      .click();
    await expect(
      otherPage.getByRole("button", { name: "Nova tarefa", exact: true }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }

  await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Ana Oliveira da Silva");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Seu nome foi atualizado",
  );
  expect(
    (
      await persisted("SELECT nome FROM usuarios WHERE id=$1", [
        admin.usuario.id,
      ])
    ).rows[0].nome,
  ).toBe("Ana Oliveira da Silva");
  await page.getByRole("link", { name: "Minha casa", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da república", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar saída", exact: true })
    .click();
  await expect(page.getByText("Sua república começa por aqui.")).toBeVisible();
  expect(
    (
      await persisted("SELECT ativo FROM membros_republica WHERE id=$1", [
        adminAccount.membro!.id,
      ])
    ).rows[0].ativo,
  ).toBe(false);
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta." }),
  ).toBeVisible();
  expect(
    (
      await request.get(`${url}/me`, { headers: headers(admin.token) })
    ).status(),
  ).toBe(401);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});

test("paginação, data civil, isolamento e sessão revogada", async ({
  page,
  request,
}) => {
  const admin = await apiLogin(request, "admin.aurora");
  const another = await apiLogin(request, "admin.horizonte");
  expect(
    (
      await request.post(`${url}/republicas`, {
        headers: headers(admin.token),
        data: { nome: "Casa Aurora" },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post(`${url}/republicas`, {
        headers: headers(another.token),
        data: { nome: "Casa Horizonte" },
      })
    ).status(),
  ).toBe(201);
  const me = await account(request, admin.token);
  for (let index = 1; index <= 21; index++)
    expect(
      (
        await request.post(`${url}/tarefas`, {
          headers: headers(admin.token),
          data: {
            titulo: `Rotina ${String(index).padStart(2, "0")}`,
            responsavelId: me.membro!.id,
            prazo: "2030-01-15",
          },
        })
      ).status(),
    ).toBe(201);
  const privateTask = await request.post(`${url}/tarefas`, {
    headers: headers(another.token),
    data: {
      titulo: "Exclusiva da Horizonte",
      responsavelId: (await account(request, another.token)).membro!.id,
    },
  });
  expect(privateTask.status()).toBe(201);
  const session = await login(page, "admin.aurora@integracao.rephouse.test");
  await page.getByRole("link", { name: "Tarefas", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(20);
  await expect(page.getByText("Exclusiva da Horizonte")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Paginação" }),
  ).toContainText("Página 1 de 2");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Paginação" }),
  ).toContainText("Página 2 de 2");
  expect(
    (
      await persisted(
        "SELECT count(*)::int AS total FROM tarefas WHERE republica_id=$1",
        [me.membro!.republicaId],
      )
    ).rows[0].total,
  ).toBe(21);
  expect(
    (
      await request.post(`${url}/auth/logout`, {
        headers: headers(session.token),
      })
    ).status(),
  ).toBe(204);
  await page.getByRole("button", { name: "Atualizar tarefas" }).click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Sua sessão expirou ou foi encerrada",
  );
});

test("visual em computador e celular, entrada inválida e navegação por teclado", async ({
  page,
  request,
}) => {
  await mkdir(
    new URL("../../.devops-local/interface/imagens/painel-original-restaurado/", import.meta.url),
    { recursive: true },
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "../.devops-local/interface/imagens/painel-original-restaurado/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../.devops-local/interface/imagens/painel-original-restaurado/login-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await login(page, "carla@integracao.rephouse.test");
  await page
    .getByLabel("Código de entrada", { exact: true })
    .fill("INVALIDO99");
  await page
    .getByRole("button", { name: "Entrar na república", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Código de entrada inválido",
  );
  await page.getByRole("button", { name: "Criar minha república" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Código de entrada", { exact: true })
    .fill(
      (await account(request, (await apiLogin(request, "admin.aurora")).token))
        .membro!.republica.codigoEntrada,
    );
  await page
    .getByRole("button", { name: "Entrar na república", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Casa Aurora" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tarefas", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(20);
  await expect(
    page.getByRole("button", { name: "Nova tarefa", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Concluir:/ })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../.devops-local/interface/imagens/painel-original-restaurado/tarefas-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Pular para o conteúdo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/tarefas$/);
  await page.screenshot({
    path: "../.devops-local/interface/imagens/painel-original-restaurado/tarefas-desktop.png",
    fullPage: true,
  });
});
