/**
 * Chạy bộ kiểm tra giao diện: `npm run check`.
 * Tự bật vite dev nếu app chưa chạy, chạy lần lượt từng script, báo đạt/lỗi.
 */
import { spawn } from "node:child_process";
import { BASE_URL } from "./lib/browser.mjs";

/** Script tự thoát mã ≠ 0 khi lỗi. Không gồm script gọi AI thật (tốn quota). */
const CHECKS = ["mobile-pages-check.mjs", "swipe-check.mjs"];

const isUp = () =>
  fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })
    .then((r) => r.ok)
    .catch(() => false);

const run = (cmd, args, opts = {}) =>
  spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

let vite = null;
if (!(await isUp())) {
  const port = new URL(BASE_URL).port || "5173";
  console.log(`[check] bật vite ở cổng ${port}…`);
  vite = run("npx", ["vite", "--port", port, "--strictPort"], { stdio: "ignore" });
  for (let i = 0; i < 60 && !(await isUp()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await isUp())) {
    console.error("[check] vite không lên được.");
    vite.kill();
    process.exit(1);
  }
}

const failed = [];
for (const name of CHECKS) {
  console.log(`\n[check] ▶ ${name}`);
  const code = await new Promise((resolve) => run("node", [`scripts/${name}`]).on("exit", resolve));
  if (code !== 0) failed.push(name);
}

vite?.kill();
console.log(failed.length ? `\n[check] ✗ lỗi: ${failed.join(", ")}` : "\n[check] ✓ tất cả đạt");
process.exit(failed.length ? 1 : 0);
