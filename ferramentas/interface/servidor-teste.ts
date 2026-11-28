import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createApp } from "../../codigo/app.js";
import { abrirAmbienteIntegracao } from "../integracao/ambiente.js";
import { createAuthService } from "../../codigo/modulos/autenticacao/auth.service.js";
import { hash, argon2id } from 'argon2';
import { createNotificationsSignal } from '../../codigo/modulos/notificacoes/notificacoes.stream.js';
import { generateKeyPair, SignJWT } from 'jose';
import { createGoogleVerifier } from '../../codigo/modulos/autenticacao/google.verifier.js';

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
  for (const name of ["google-vinculo", "admin", "morador", "removido", "outra-casa", "excluir", "master", "financeiro-admin", "financeiro-morador", "polimento-admin", "polimento-ana", "polimento-bruno", "reenvio-despesas", "reenvio-tarefas", "validacao-despesas", "validacao-tarefas", "avisos-admin", "avisos-ana", "avisos-bruno", "tema-admin", "perfil-admin", "perfil-morador", "perfil-sem-casa"]) {
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
// Google do harness: chaves locais no lugar das do Google. A API usa o verificador real (assinatura, emissor,
// destinatário, e-mail verificado e nonce), só que apontado para esta chave. Vale apenas para google.spec.ts,
// que simula a produção sem envio de e-mail.
const googleClientId = 'rephouse-interface-teste.apps.googleusercontent.com';
const googleKeys = await generateKeyPair('RS256');
const googleOptions = { clientId: googleClientId, verify: createGoogleVerifier(googleClientId, async () => googleKeys.publicKey) };
const createTestApp = (suite?: string) => createApp({
  database: environment.db,
  jwtSecret,
  notificationsSignal: notificationSignal,
  // Igual ao ambiente real: o Vite de teste é o único proxy e repassa o IP em X-Forwarded-For.
  trustProxy: 1,
  corsOrigins: ["http://127.0.0.1:5174"],
  privacyContact: "privacidade@integracao.rephouse.test",
  ...(suite === 'google.spec.ts' ? { google: googleOptions } : { email: { publicUrl: 'http://127.0.0.1:5174', send: async message => {
    // Caixa de e-mail do harness, fora do produto e acessível somente com o identificador da execução.
    const params = message.confirmacao!.params;
    emails.set(message.to, 'codigoConfirmacao' in params ? { codigo: params.codigoConfirmacao } : { link: params.linkConfirmacao });
  } } }),
});
const emails = new Map<string, { link: string } | { codigo: string }>();
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
    res.writeHead(emails.has(email) ? 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(emails.get(email) ?? null));
    return;
  }
  if (req.method === 'GET' && req.url?.startsWith('/__interface_google?') && req.headers['x-interface-test-run'] === runId) {
    // Emite a credencial que o Google entregaria ao navegador para o nonce do desafio da página.
    const params = new URL(req.url, 'http://127.0.0.1').searchParams;
    const email = params.get('email')!;
    void new SignJWT({ email, email_verified: true, nonce: params.get('nonce')!, ...(params.get('nome') ? { name: params.get('nome')! } : {}) })
      .setSubject(params.get('sub') ?? 'google-' + email).setIssuer('https://accounts.google.com').setAudience(googleClientId)
      .setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setExpirationTime('10m').sign(googleKeys.privateKey)
      .then(credential => res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ credential })));
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
    if (!suiteApps.has(suite)) suiteApps.set(suite, createTestApp(suite));
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
