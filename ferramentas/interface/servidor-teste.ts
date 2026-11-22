import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createApp } from "../../codigo/app.js";
import { abrirAmbienteIntegracao } from "../integracao/ambiente.js";
import { createAuthService } from "../../codigo/modulos/autenticacao/auth.service.js";
import { hash, argon2id } from 'argon2';
import { createNotificationsSignal } from '../../codigo/modulos/notificacoes/notificacoes.stream.js';

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
const fixturePasswordHash = await hash('Senha-interface-teste-2026', { type: argon2id });
try {
  for (const name of ["admin", "morador", "removido", "outra-casa", "excluir", "master", "financeiro-admin", "financeiro-morador", "polimento-admin", "polimento-ana", "polimento-bruno", "reenvio-despesas", "reenvio-tarefas", "validacao-despesas", "validacao-tarefas", "avisos-admin", "avisos-ana", "avisos-bruno", "tema-admin", "perfil-admin", "perfil-morador", "perfil-sem-casa"]) {
    const email = `gestao-${name}@integracao.rephouse.test`;
    await environment.db.usuario.create({ data: { nome: `Gestão ${name}`, email, senhaHash: fixturePasswordHash } });
    const session = await auth.login({ email, senha: 'Senha-interface-teste-2026' });
    if (name === "master") await environment.db.usuario.update({ where: { id: session.usuario.id }, data: { tipoUsuario: "USUARIO_MASTER" } });
    managementAccounts[name] = { token: session.token, id: session.usuario.id, email };
  }
  await mkdir(".devops-local/interface", { recursive: true });
  await writeFile(".devops-local/interface/gestao-contas.json", JSON.stringify(managementAccounts));
} catch (error) {
  await environment.close();
  throw error;
}
const notificationUrl = new URL(process.env.TEST_DATABASE_URL!);
notificationUrl.searchParams.set('schema', environment.schema);
const notificationSignal = createNotificationsSignal(notificationUrl.toString(), () => {});
const createTestApp = () => createApp({
  database: environment.db,
  jwtSecret,
  notificationsSignal: notificationSignal,
  corsOrigins: ["http://127.0.0.1:5174"],
  email: { publicUrl: 'http://127.0.0.1:5174', send: async message => {
    // Caixa de e-mail do harness, fora do produto e acessível somente com o identificador da execução.
    const proof = new URL(message.text.match(/http:\/\/[^\s]+/)![0]);
    emails.set(message.to, proof.href);
  } },
});
const emails = new Map<string, string>();
const app = createTestApp();
const suiteApps = new Map<string, ReturnType<typeof createApp>>();
let finish: () => void = () => {};
const ended = new Promise<void>((resolve) => {
  finish = resolve;
});
// Somente o harness local possui esta rota. Ela não faz parte da API do produto.
const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url?.startsWith('/__interface_email?') && req.headers['x-interface-test-run'] === runId) {
    const email = new URL(req.url, 'http://127.0.0.1').searchParams.get('email')!;
    res.writeHead(emails.has(email) ? 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ link: emails.get(email) ?? null }));
    return;
  }
  if (
    req.method === "POST" &&
    req.url === "/__interface_shutdown" &&
    req.headers["x-interface-test-run"] === runId
  ) {
    res.writeHead(204).end();
    finish();
    return;
  }
  // Cada arquivo representa uma instância independente da API: limites reais, sem
  // compartilhamento acidental entre jornadas de pessoas fictícias da suíte inteira.
  const suite = req.headers['x-interface-suite'];
  if (req.headers['x-interface-test-run'] === runId && typeof suite === 'string' && /^[a-z0-9-]+\.spec\.ts$/.test(suite)) {
    if (!suiteApps.has(suite)) suiteApps.set(suite, createTestApp());
    suiteApps.get(suite)!(req, res);
  } else app(req, res);
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
  app.locals.closeNotifications();
  for (const suiteApp of suiteApps.values()) suiteApp.locals.closeNotifications();
  await notificationSignal.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await environment.close();
}
