import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createApp } from "../../codigo/app.js";
import { abrirAmbienteIntegracao } from "../integracao/ambiente.js";
import { createAuthService } from "../../codigo/modulos/autenticacao/auth.service.js";

// Este servidor usa exclusivamente o banco dedicado e um schema descartável por execução.
const environment = await abrirAmbienteIntegracao(
  process.env.TEST_DATABASE_URL,
  "Senha-interface-teste-2026",
);
const runId = process.env.REPHOUSE_INTERFACE_TEST_RUN;
if (!runId) throw new Error("Execute o servidor pelo Playwright.");
const jwtSecret = "segredo-apenas-do-ensaio-de-interface-local-2026";
// Contas exclusivas das novas jornadas, no schema descartável já validado pelo harness.
// A preparação emite sessões reais sem consumir o limitador HTTP dos testes de login.
const auth = createAuthService(environment.db, jwtSecret);
const managementAccounts: Record<string, { token: string; id: string; email: string }> = {};
try {
  for (const name of ["admin", "morador", "removido", "outra-casa", "excluir", "master"]) {
    const email = `gestao-${name}@integracao.rephouse.test`;
    const session = await auth.register({ nome: `Gestão ${name}`, email, senha: "Senha-interface-teste-2026" });
    if (name === "master") await environment.db.usuario.update({ where: { id: session.usuario.id }, data: { tipoUsuario: "USUARIO_MASTER" } });
    managementAccounts[name] = { token: session.token, id: session.usuario.id, email };
  }
  await mkdir(".devops-local/interface", { recursive: true });
  await writeFile(".devops-local/interface/gestao-contas.json", JSON.stringify(managementAccounts));
} catch (error) {
  await environment.close();
  throw error;
}
const app = createApp({
  database: environment.db,
  jwtSecret,
  corsOrigins: ["http://127.0.0.1:5174"],
});
let finish: () => void = () => {};
const ended = new Promise<void>((resolve) => {
  finish = resolve;
});
// Somente o harness local possui esta rota. Ela não faz parte da API do produto.
const server = createServer((req, res) => {
  if (
    req.method === "POST" &&
    req.url === "/__interface_shutdown" &&
    req.headers["x-interface-test-run"] === runId
  ) {
    res.writeHead(204).end();
    finish();
    return;
  }
  app(req, res);
}).listen(3405, "127.0.0.1");
try {
  await once(server, "listening");
  await mkdir(".devops-local/interface", { recursive: true });
  await writeFile(
    ".devops-local/interface/ambiente.json",
    JSON.stringify({ schema: environment.schema, port: 3405, runId }),
  );
  process.once("SIGINT", finish);
  process.once("SIGTERM", finish);
  await ended;
} finally {
  process.removeListener("SIGINT", finish);
  process.removeListener("SIGTERM", finish);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await environment.close();
}
