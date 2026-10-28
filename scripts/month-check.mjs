import { launchBrowser, BASE_URL } from "./lib/browser.mjs";

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const log = (...a) => console.log(...a);

await page.goto(BASE_URL + "/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

// ---------- 1. Thời khoá biểu ----------
await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).click();
await page.waitForTimeout(500);
const monthTitle = () => page.getByRole("main").locator("section").first().locator("h2").first();
log("month label:", await monthTitle().textContent());
log("cells:", await page.locator("main button").count());
log("legend nhóm:", await page.locator("text=Chấm màu theo nhóm").count());

// Chọn ngày 22 (có cả lớp và việc một lần)
await page.getByRole("button", { name: "22", exact: true }).first().click();
await page.waitForTimeout(300);
log("detail 22:", (await page.locator("text=Thông tin chi tiết").locator("..").textContent())?.slice(0, 200));
await page.screenshot({ path: "smoke/30-month-day22.png" });

// Chuyển tháng
const before = await monthTitle().textContent();
await page.getByRole("button", { name: "Tháng trước" }).click();
await page.waitForTimeout(300);
const after = await monthTitle().textContent();
log("prev month:", before, "→", after);
await page.getByRole("main").getByRole("button", { name: "Hôm nay", exact: true }).click();
await page.waitForTimeout(300);
log("today back:", await monthTitle().textContent());

// ---------- 2. Mở session editor từ chi tiết ngày ----------
await page.getByText("Tiếng Anh B1", { exact: true }).first().click();
await page.waitForTimeout(400);
log("modal mở:", await page.getByText("Sửa buổi học").count());
const repeat = page.locator("select").filter({ has: page.locator('option[value="custom"]') });
log("repeat value:", await repeat.inputValue());
await repeat.selectOption("custom");
await page.waitForTimeout(200);
const customInput = page.locator('input[type="number"][max="16"]');
log("custom input hiện:", await customInput.count(), "value:", await customInput.inputValue());
await customInput.fill("5");
await page.getByRole("button", { name: "Lưu" }).click();
await page.waitForTimeout(600);

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("track-tkb:v1")));
const english = saved.sessions.find((s) => s.interval_weeks === 5);
log("đã lưu interval_weeks = 5:", Boolean(english));

// ---------- 3. Exception: huỷ 1 buổi, buổi đó biến mất + hiện "Đã huỷ / dời" ----------
const today = await page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
await page.evaluate((date) => {
  const key = "track-tkb:v1";
  const data = JSON.parse(localStorage.getItem(key));
  const session = data.sessions.find((s) => s.interval_weeks === 5);
  // Trả lại lịch cách 2 tuần để buổi hôm nay có thật, rồi mới huỷ thử.
  session.interval_weeks = 2;
  data.exceptions = [
    { id: crypto.randomUUID(), session_id: session.id, date, note: "nghỉ thử" },
  ];
  localStorage.setItem(key, JSON.stringify(data));
}, today);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).click();
await page.waitForTimeout(400);
log("huỷ hiện trong panel:", await page.getByText("Đã huỷ / dời").count());
log("buổi bị huỷ còn trong chi tiết:", await page.getByText("Tiếng Anh B1", { exact: true }).count());
await page.screenshot({ path: "smoke/31-month-exception.png" });

// Hoàn tác huỷ → buổi học hiện lại
await page.getByRole("button", { name: "Hoàn tác" }).click();
await page.waitForTimeout(600);
log("sau hoàn tác, buổi học trở lại:", await page.getByText("Tiếng Anh B1", { exact: true }).count());

// ---------- 4. Settings: bảng màu gợi ý ----------
await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
await page.waitForTimeout(400);
log("section nhóm:", await page.getByText("Nhóm & màu chấm", { exact: true }).count());
await page.getByRole("button", { name: "Thêm nhóm", exact: true }).click();
await page.waitForTimeout(300);
log("swatch màu:", await page.locator('button[aria-label="Vàng"]').count(), await page.locator('button[aria-label="Đỏ"]').count());
log("ô màu tuỳ chỉnh:", await page.locator('input[type="color"]').count());
await page.screenshot({ path: "smoke/32-tag-color-modal.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
