import { spawn } from "node:child_process";

const procs = [];
function run(name, cmd, args) {
  const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  p.on("exit", (code) => {
    console.log(`[${name}] exited ${code ?? ""}`);
    shutdown();
  });
  procs.push(p);
}

function shutdown() {
  for (const p of procs) {
    if (!p.killed) p.kill();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("ai", "node", ["--env-file-if-exists=.env", "server/index.mjs"]);
run("vite", "npx", ["vite"]);
