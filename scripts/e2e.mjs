import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const TITLE = "Kiểm tra thêm việc " + Date.now();

await page.getByRole("button", { name: "Thêm lịch", exact: true }).first().click();
await page.getByPlaceholder("VD: Giải tích 2, họp nhóm, nộp báo cáo…").fill(TITLE);
await page.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(600);

const appeared = await page.getByText(TITLE, { exact: true }).count();
console.log("created:", appeared > 0);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
const persisted = await page.getByText(TITLE, { exact: true }).count();
console.log("persisted after reload:", persisted > 0);

// mở lại để xoá
await page.getByText(TITLE, { exact: true }).first().click();
await page.getByRole("button", { name: "Xoá", exact: true }).click();
await page.waitForTimeout(500);
const gone = await page.getByText(TITLE, { exact: true }).count();
console.log("deleted:", gone === 0);

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
