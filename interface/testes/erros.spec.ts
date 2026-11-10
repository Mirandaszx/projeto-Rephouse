import { test, expect } from "@playwright/test";

test("prazo civil e data de cadastro respeitam suas semânticas de fuso", async ({
  page,
}) => {
  await page.goto("/");
  const formatted = await page.evaluate(async () => {
    const modulePath = "/codigo/api/client.ts";
    const { civilDate, instantDate } = await import(modulePath);
    return {
      prazo: civilDate("2030-01-15T00:00:00.000Z"),
      cadastro: instantDate("2030-01-15T01:00:00.000Z"),
    };
  });
  expect(formatted).toEqual({ prazo: "15/01/2030", cadastro: "14/01/2030" });
});

// Respostas simuladas verificam apresentação de erros; não representam ensaios de falha do PostgreSQL.
for (const status of [400, 401, 403, 404, 409, 429, 503]) {
  test(`erro HTTP ${status} exibe mensagem pública e identificação`, async ({
    page,
  }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "teste-interface-sem-token",
          ...(status === 429 ? { "Retry-After": "30" } : {}),
        },
        body: JSON.stringify({
          error: {
            code: `TEST_${status}`,
            message: "Mensagem pública de teste.",
          },
        }),
      }),
    );
    await page.goto("/");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("teste@interface.rephouse.test");
    await page
      .getByLabel("Senha", { exact: true })
      .fill("Senha-interface-teste-2026");
    await page.getByRole("button", { name: "Entrar na minha conta" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Mensagem pública de teste.",
    );
    await page.getByText("Identificação para suporte").click();
    await expect(page.getByRole("alert")).toContainText(
      "teste-interface-sem-token",
    );
    if (status === 429)
      await expect(page.getByRole("alert")).toContainText("30 segundos");
    if (status === 503)
      await expect(page.getByRole("alert")).toContainText(
        "temporariamente indisponível",
      );
  });
}
test("resposta HTML de proxy não é exibida como erro interno", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<h1>segredo-do-proxy</h1>",
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("teste@interface.rephouse.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Senha-interface-teste-2026");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível concluir",
  );
  await expect(page.getByText("segredo-do-proxy")).toHaveCount(0);
});
