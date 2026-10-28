import { launchBrowser, BASE_URL } from "./lib/browser.mjs";

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const base = BASE_URL + "/?local=1";
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("track-tkb:v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);

const { todayISO, nextISO, plus14ISO } = await page.evaluate(() => {
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const add = (n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return { todayISO: iso(now), nextISO: iso(add(7)), plus14ISO: iso(add(14)) };
});
const plus7ISO = nextISO;

const dlg = page.getByRole("dialog");
const titleInput = () => dlg.getByPlaceholder("VD: Giải tích 2, họp nhóm, nộp báo cáo…");
const repeatSelect = () => dlg.locator("select").filter({ hasText: "Không lặp" });
const groupSelect = () => dlg.locator("select").filter({ hasText: "Không gắn nhóm" });

const openCreate = async () => {
  await page.getByRole("button", { name: "Thêm lịch", exact: true }).last().click();
  await page.waitForTimeout(300);
};

/** Chọn đúng tháng rồi bấm ngày, kể cả ngày nằm ngoài lưới tháng hiện tại. */
const goToDate = async (iso) => {
  const month = iso.slice(0, 7) + "-01";
  await page.locator("main select").first().selectOption(month);
  await page.waitForTimeout(250);
  await page.locator(`[data-date="${iso}"]`).click();
  await page.waitForTimeout(250);
};

// ---------- 1. Lịch có nhóm tự tạo + lặp hàng tuần ----------
const weeklyTitle = "Lịch lặp kiểm tra " + Date.now();
const customGroup = "Nhóm tự tạo " + Date.now();
await openCreate();
await titleInput().fill(weeklyTitle);
const times = dlg.locator('input[type="time"]');
await times.nth(0).fill("09:00");
await times.nth(1).fill("10:00");
await repeatSelect().selectOption("1");
await page.waitForTimeout(200);
const repeatUntil = await dlg.locator('input[type="date"]').nth(1).inputValue();
console.log("repeat_until mặc định:", repeatUntil, "(>= hôm nay:", repeatUntil >= todayISO, ")");

await groupSelect().selectOption("__new__");
await dlg.getByPlaceholder("VD: Lịch học, Dự án, CLB…").fill(customGroup);
await dlg.getByRole("button", { name: "Tím" }).click();
await page.screenshot({ path: "smoke/74-plan-custom-group.png" });
await dlg.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);
console.log("toast thêm lịch:", await page.getByText("Đã thêm lịch", { exact: true }).count());

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("track-tkb:v1")));
const weekly = saved.entries.find((e) => e.title === weeklyTitle);
const savedGroup = saved.tags.find((t) => t.name === customGroup);
console.log("đã lưu:", {
  repeat_weekly: weekly?.repeat_weekly,
  repeat_interval_weeks: weekly?.repeat_interval_weeks,
  repeat_until: weekly?.repeat_until,
  tag_id: Boolean(weekly?.tag_id),
});
console.log("nhóm tự tạo:", Boolean(savedGroup), "khớp tag:", weekly?.tag_id === savedGroup?.id);
console.log("hiện hôm nay:", await page.getByRole("main").getByText(weeklyTitle, { exact: true }).count());

await goToDate(nextISO);
await page.waitForTimeout(300);
console.log("hiện tuần sau:", await page.getByRole("main").getByText(weeklyTitle, { exact: true }).count());
console.log("badge Hàng tuần:", await page.getByText("Hàng tuần", { exact: true }).count());

// ---------- 2. Lịch lặp cách 2 tuần ----------
await goToDate(todayISO);
const biweeklyTitle = "Lịch cách 2 tuần " + Date.now();
await openCreate();
await titleInput().fill(biweeklyTitle);
await dlg.locator('input[type="time"]').nth(0).fill("14:00");
await dlg.locator('input[type="time"]').nth(1).fill("15:00");
await repeatSelect().selectOption("2");
await dlg.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);

const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem("track-tkb:v1")));
const biweekly = saved2.entries.find((e) => e.title === biweeklyTitle);
console.log("cách 2 tuần đã lưu:", biweekly?.repeat_interval_weeks, "repeat:", biweekly?.repeat_weekly);

await goToDate(todayISO);
console.log("cách 2 tuần · tuần 0:", await page.getByRole("main").getByText(biweeklyTitle, { exact: true }).count());
await goToDate(plus7ISO);
console.log("cách 2 tuần · tuần 1 (phải 0):", await page.getByRole("main").getByText(biweeklyTitle, { exact: true }).count());
await goToDate(plus14ISO);
console.log("cách 2 tuần · tuần 2:", await page.getByRole("main").getByText(biweeklyTitle, { exact: true }).count());
console.log("badge Cách 2 tuần:", await page.getByText("Cách 2 tuần", { exact: true }).count());

// ---------- 3. Lịch không gắn nhóm → ẩn khỏi lịch, hiện ở Tất cả ----------
const untaggedTitle = "Lịch không nhóm " + Date.now();
await openCreate();
await titleInput().fill(untaggedTitle);
await groupSelect().selectOption("");
console.log("cảnh báo không nhóm:", await dlg.getByText("không hiện trên lịch tháng / Hôm nay").count());
await page.screenshot({ path: "smoke/71-plan-untagged-form.png" });
await dlg.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);
console.log("ẩn khỏi lịch tháng:", (await page.getByRole("main").getByText(untaggedTitle, { exact: true }).count()) === 0);

await page.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await page.waitForTimeout(500);
console.log("hiện ở Tất cả:", await page.getByText(untaggedTitle, { exact: true }).count());
console.log("mục Chưa gắn nhóm:", await page.getByText("Chưa gắn nhóm", { exact: false }).count());
await page.screenshot({ path: "smoke/72-plan-all-untagged.png", fullPage: true });

await page.getByText(untaggedTitle, { exact: true }).first().click();
await page.waitForTimeout(300);
await groupSelect().selectOption({ label: "Lịch học" });
await dlg.getByRole("button", { name: "Lưu", exact: true }).click();
await page.waitForTimeout(700);

await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).click();
await page.waitForTimeout(400);
console.log(
  "sau khi gắn nhóm, hiện trên lịch:",
  await page.getByRole("main").getByText(untaggedTitle, { exact: true }).count(),
);
await page.screenshot({ path: "smoke/73-plan-month-after.png", fullPage: true });

// ---------- 4. Form gọn: không còn Loại / Môn liên quan ----------
await openCreate();
console.log("ô Loại còn:", await dlg.getByText("Sự kiện / hoạt động", { exact: true }).count());
console.log("ô Môn liên quan còn:", await dlg.getByText("Môn liên quan", { exact: true }).count());
console.log("nút Buổi học còn ở footer?:", await page.getByRole("button", { name: "Buổi học", exact: true }).count());
console.log("nút Công việc còn?:", await page.getByRole("button", { name: "Công việc", exact: true }).count());
await page.keyboard.press("Escape");

await page.screenshot({ path: "smoke/70-plan-check.png", fullPage: true });
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
