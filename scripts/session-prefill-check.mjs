import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).click();
await page.waitForTimeout(300);

const target = await page.evaluate(() => {
  const d = new Date();
  d.setDate(22);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-22`;
});
await page.locator(`[data-date="${target}"]`).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Thêm lịch", exact: true }).last().click();
await page.waitForTimeout(400);

const dlg = page.getByRole("dialog");
const dateInput = dlg.locator('input[type="date"]').first();
const repeatSelect = dlg.locator("select").filter({ hasText: "Không lặp" });
const tagSelect = dlg.locator("select").filter({ hasText: "Không gắn nhóm" });

console.log("ngày chọn trên lịch:", target);
console.log("ngày trong form:", await dateInput.inputValue());
console.log("lặp mặc định:", await repeatSelect.inputValue());
console.log("nhóm mặc định:", await tagSelect.locator("option:checked").innerText());

await repeatSelect.selectOption("2");
await page.waitForTimeout(250);
const until = await dlg.locator('input[type="date"]').nth(1).inputValue();
console.log("lặp đến mặc định:", until, ">= ngày bắt đầu:", until >= target);
console.log("gợi ý lặp:", await dlg.getByText(/cách 2 tuần/).count());
await page.screenshot({ path: "smoke/33-plan-prefill.png" });

console.log(errors.length ? "ERRORS: " + errors.join("; ") : "NO_RUNTIME_ERRORS");
await browser.close();
