/// <reference types="bun" />

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun run scripts/compose.ts <compose args...>");
  process.exit(1);
}

const composeCommand = getComposeCommand();

const proc = Bun.spawn([...composeCommand, ...args], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit"
});

process.exit(await proc.exited);

function getComposeCommand() {
  const composeV2 = Bun.spawnSync(["docker", "compose", "version"], {
    stdout: "ignore",
    stderr: "ignore"
  });

  if (composeV2.success) {
    return ["docker", "compose"];
  }

  const composeV1 = Bun.spawnSync(["docker-compose", "--version"], {
    stdout: "ignore",
    stderr: "ignore"
  });

  if (composeV1.success) {
    return ["docker-compose"];
  }

  console.error("Docker Compose was not found. Install Docker Compose v2 or the legacy docker-compose binary.");
  process.exit(1);
}

export {};
