import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const errors = [];

// ---------- 1. Migration dữ liệu cũ (chưa có tag) ----------
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

await page.evaluate(() => {
  const key = "track-tkb:v1";
  const data = JSON.parse(localStorage.getItem(key));
  delete data.tags;
  data.sessions = data.sessions.map(({ tag_id, ...rest }) => rest);
  data.entries = data.entries.map(
    ({ tag_id, repeat_weekly, repeat_interval_weeks, repeat_until, ...rest }) => rest,
  );
  localStorage.setItem(key, JSON.stringify(data));
});

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "smoke/17-migrated-today.png" });

const after = await page.evaluate(() => JSON.parse(localStorage.getItem("track-tkb:v1")));
console.log("=== MIGRATION ===");
console.log("tags:", after.tags.map((t) => `${t.name} ${t.color}`));
console.log("sessions có tag:", after.sessions.every((s) => Boolean(s.tag_id)));
console.log("entries có tag:", after.entries.every((e) => Boolean(e.tag_id)));
console.log("có interval_weeks:", after.sessions.every((s) => s.interval_weeks >= 1));
console.log(
  "có repeat_weekly/repeat_interval_weeks/repeat_until:",
  after.entries.every(
    (e) =>
      e.repeat_weekly === false &&
      e.repeat_interval_weeks === 1 &&
      e.repeat_until === null,
  ),
);
console.log("có exceptions[]:", Array.isArray(after.exceptions));
console.log(
  "chip Lịch học:",
  await page.getByRole("button", { name: "Lịch học", exact: true }).count(),
);

// ---------- 2. Mobile ----------
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
m.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
await m.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await m.waitForTimeout(900);
await m.screenshot({ path: "smoke/18-mobile-today.png" });
await m.getByRole("button", { name: "TKB", exact: true }).click();
await m.waitForTimeout(600);
await m.screenshot({ path: "smoke/19-mobile-month.png" });
await m.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await m.waitForTimeout(600);
await m.screenshot({ path: "smoke/20-mobile-all.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
