/// <reference types="bun" />

type Service = {
  name: string;
  cwd: string;
  command: string[];
};

const services: Service[] = [
  {
    name: "api",
    cwd: "apps/server",
    command: ["bun", "run", "dev"]
  },
  {
    name: "web",
    cwd: "apps/web",
    command: ["bun", "run", "dev", "--host", "0.0.0.0"]
  }
];

const processes = services.map((service) => {
  const proc = Bun.spawn(service.command, {
    cwd: service.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: Bun.env
  });

  pipeLines(service.name, proc.stdout);
  pipeLines(service.name, proc.stderr);

  return { ...service, proc };
});

function pipeLines(name: string, stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  void (async () => {
    for await (const chunk of stream) {
      const text = decoder.decode(chunk);
      for (const line of text.split(/\r?\n/)) {
        if (line.length > 0) {
          console.log(`[${name}] ${line}`);
        }
      }
    }
  })();
}

function shutdown() {
  for (const service of processes) {
    service.proc.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

console.log("Starting full stack dev servers:");
console.log("- API: http://localhost:3001");
console.log("- Web: http://localhost:5173");
console.log("- Dashboard: http://localhost:5173/dashboard");

const results = await Promise.all(processes.map((service) => service.proc.exited));
process.exit(results.find((code) => code !== 0) ?? 0);

export {};
