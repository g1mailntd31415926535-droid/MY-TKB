import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto("http://localhost:5173/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: "AI Inbox", exact: true }).click();
await page.waitForTimeout(400);

await page
  .locator("textarea")
  .fill(
    "Thông báo lớp: buổi Giải tích 2 thứ Hai ngày 26/10/2026 nghỉ. " +
      "Buổi Tiếng Anh B1 thứ Bảy ngày 24/10/2026 dời sang Chủ nhật ngày 25/10/2026, giờ 09:00-11:30, phòng C3-212.",
  );

await page.getByRole("button", { name: "Đọc & tách công việc" }).click();
await page.getByText("Cần bạn xác nhận", { exact: false }).waitFor({ timeout: 90000 });
await page.waitForTimeout(500);

const cards = page.locator("main .space-y-3 > div");
const n = await cards.count();
console.log("số draft:", n);
for (let i = 0; i < n; i++) {
  const card = cards.nth(i);
  const title = await card.locator("input").first().inputValue().catch(() => "?");
  const text = (await card.innerText()).replace(/\s+/g, " ").slice(0, 200);
  console.log(`draft ${i}: [${title}]`, text);
}
await page.screenshot({ path: "smoke/40-ai-change.png", fullPage: true });

// Xác nhận tất cả draft (huỷ + dời)
for (let guard = 0; guard < 10; guard++) {
  const count = await page.locator("main .space-y-3 > div").count();
  if (count === 0) break;
  const card = page.locator("main .space-y-3 > div").first();
  const btn = card.locator("button").filter({ hasText: /Xác nhận/ }).last();
  console.log(`bấm:`, await btn.innerText());
  await btn.click();
  await page.waitForTimeout(900);
}

const data = await page.evaluate(() => JSON.parse(localStorage.getItem("track-tkb:v1")));
console.log("exceptions:", data.exceptions.map((e) => `${e.date} ${e.note}`));
const moved = data.entries.filter((e) => e.tag_id && data.tags.find((t) => t.id === e.tag_id)?.name === "Đã đổi");
console.log(
  "entry Đã đổi:",
  moved.map((e) => `${e.date} ${e.start_time}-${e.end_time} ${e.title}`),
);
console.log("tags:", data.tags.map((t) => t.name));

// Xem lịch tháng ngày 25
await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "25", exact: true }).first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: "smoke/41-month-moved.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
