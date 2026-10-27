import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "AI Inbox", exact: true }).click();

await page.locator('input[type="file"]').setInputFiles("smoke/notice.png");
await page.getByRole("button", { name: "Đọc & tách công việc" }).click();

await page.getByText(/Cần bạn xác nhận/).waitFor({ timeout: 90_000 });
await page.screenshot({ path: "smoke/06-ai-drafts.png", fullPage: true });

const cards = await page.locator('button:has-text("Xác nhận thêm")').count();
console.log("drafts:", cards);

await page.locator('button:has-text("Xác nhận thêm")').first().click();
await page.waitForTimeout(800);
const after = await page.locator('button:has-text("Xác nhận thêm")').count();
console.log("after confirm:", after, "(phải giảm 1)");

await page.getByRole("button", { name: "Tất cả", exact: true }).click();
await page.waitForTimeout(600);
const found = await page.getByText("Họp nhóm đồ án", { exact: true }).count();
console.log("đã nằm trong lịch:", found > 0);
await page.screenshot({ path: "smoke/07-ai-added.png", fullPage: true });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
