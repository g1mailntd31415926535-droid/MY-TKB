import { launchBrowser, BASE_URL } from "./lib/browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.env.SMOKE_OUT ?? "smoke";
mkdirSync(OUT, { recursive: true });

const browser = await launchBrowser();

const errors = [];

async function pass(name, viewport, labels) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));

  await page.goto(BASE_URL + "/?local=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-01-month.png` });

  const pages = [
    [labels[0], "02-month"],
    [labels[1], "03-all"],
    [labels[2], "04-ai"],
    [labels[3], "05-settings"],
  ];

  for (const [label, file] of pages) {
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-${file}.png` });
  }
  await page.close();
}

await pass("desktop", { width: 1440, height: 950 }, ["Thời khoá biểu", "Tất cả", "AI Inbox", "Cài đặt"]);
await pass("mobile", { width: 390, height: 844 }, ["TKB", "Tất cả", "AI", "Cài đặt"]);

console.log(errors.length ? errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
