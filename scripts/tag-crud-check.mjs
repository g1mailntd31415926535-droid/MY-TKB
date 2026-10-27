import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("dialog", (d) => d.accept());

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Cài đặt" }).first().click();
await page.waitForTimeout(500);
await page.getByRole("heading", { name: "Nhóm & màu chấm" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "smoke/21-settings-tag-section.png" });

// Thêm nhóm
await page.getByRole("button", { name: "Thêm nhóm" }).click();
await page.waitForTimeout(300);
const dlg = page.getByRole("dialog");
await dlg.getByLabel("Tên nhóm").fill("CLB");
await dlg.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);
console.log("=== ADD GROUP ===");
console.log("CLB trong cài đặt:", await page.getByText("CLB", { exact: true }).count());
await page.screenshot({ path: "smoke/22-settings-tag-added.png" });

// lọc theo nhãn mới ở trang Tất cả
await page.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await page.waitForTimeout(500);
console.log("chip CLB:", await page.getByRole("button", { name: "CLB", exact: true }).count());

// sửa Tên nhóm
await page.getByRole("button", { name: "Cài đặt" }).first().click();
await page.waitForTimeout(400);
const row = page.locator("div").filter({ hasText: /^CLB/ }).first();
await row.getByRole("button", { name: "Sửa" }).click();
await page.waitForTimeout(300);
const dlg2 = page.getByRole("dialog");
await dlg2.getByLabel("Tên nhóm").fill("CLB Học thuật");
await dlg2.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);
console.log("=== EDIT GROUP ===");
console.log("tên mới:", await page.getByText("CLB Học thuật", { exact: true }).count());

// xoá nhóm
const row2 = page.locator("div").filter({ hasText: /^CLB Học thuật/ }).first();
await row2.getByRole("button", { name: "Xoá" }).click();
await page.waitForTimeout(800);
console.log("=== DELETE GROUP ===");
console.log("còn lại:", await page.getByText("CLB Học thuật", { exact: true }).count());
await page.screenshot({ path: "smoke/23-settings-tag-deleted.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
