import { readFile, unlink } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import pg from "pg";

export default async function teardown() {
  const metadataPath = new URL(
    "../../.devops-local/interface/ambiente.json",
    import.meta.url,
  );
  const metadata = await readFile(metadataPath, "utf8")
    .then((text) => JSON.parse(text) as { schema: string; runId: string })
    .catch(() => null);
  if (!metadata || metadata.runId !== process.env.REPHOUSE_INTERFACE_TEST_RUN)
    return;
  if (!/^integration_test_[a-f0-9]+$/.test(metadata.schema))
    throw new Error("Schema de interface inválido.");
  const response = await fetch("http://127.0.0.1:3405/__interface_shutdown", {
    method: "POST",
    headers: { "X-Interface-Test-Run": metadata.runId },
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (response && response.status !== 204)
    throw new Error("O servidor de interface recusou o encerramento.");
  const databaseUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test";
  if (new URL(databaseUrl).pathname !== "/rabbu_mvp_test")
    throw new Error("Banco de testes inválido.");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // Aguardar o finally do servidor; fallback cobre encerramento abrupto do processo no Windows.
    for (let attempt = 0; attempt < 30; attempt++) {
      const exists = await client.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name=$1",
        [metadata.schema],
      );
      if (!exists.rowCount) break;
      if (attempt === 29)
        await client.query(
          `DROP SCHEMA IF EXISTS "${metadata.schema}" CASCADE`,
        );
      else await setTimeout(100);
    }
  } finally {
    await client.end();
  }
  await unlink(metadataPath);
}
