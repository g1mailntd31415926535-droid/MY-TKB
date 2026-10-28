import { readFileSync } from "node:fs";
import { launchBrowser, BASE_URL } from "./lib/browser.mjs";

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const base = BASE_URL + "/?local=1";
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "smoke/10-tags-today.png" });

console.log("=== TAGS TODAY ===");
console.log("Lịch học chip:", await page.getByRole("button", { name: "Lịch học" }).count());
console.log("Hoạt động chip:", await page.getByRole("button", { name: "Hoạt động" }).count());
console.log("Đã đổi chip:", await page.getByRole("button", { name: "Đã đổi" }).count());
console.log(
  "tag pills on items:",
  await page.locator("span", { hasText: /^Lịch học$/ }).count(),
);

// --- lọc theo tag ở trang Tất cả ---
await page.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await page.waitForTimeout(600);
const classSection = page.locator("section", { hasText: "Lịch học lặp theo tuần" });
const allSessions = await classSection.locator("button").count();
await page.getByRole("button", { name: "Hoạt động", exact: true }).click();
await page.waitForTimeout(400);
const otherSessions = await classSection.locator("button").count();
await page.getByRole("button", { name: "Lịch học", exact: true }).click();
await page.waitForTimeout(400);
const hustSessions = await classSection.locator("button").count();
await page.screenshot({ path: "smoke/11-all-filter-hust.png" });
await page.getByRole("button", { name: "Tất cả", exact: true }).nth(1).click();
await page.waitForTimeout(300);
console.log("=== FILTER ===");
console.log({ allSessions, otherSessions, hustSessions });

// --- Settings: mục nhãn ---
await page.getByRole("button", { name: "Cài đặt" }).first().click();
await page.waitForTimeout(600);
console.log("=== SETTINGS ===");
console.log("Nhóm section:", await page.getByText("Nhóm & màu chấm").count());
await page.screenshot({ path: "smoke/12-settings-tags.png" });

// --- Session editor mở được khi bấm vào một buổi học lặp có sẵn ---
await page.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await page.waitForTimeout(500);
await page
  .locator("section", { hasText: "Lịch học lặp theo tuần" })
  .locator("button")
  .first()
  .click();
await page.waitForTimeout(400);
console.log("=== SESSION EDITOR ===");
console.log("modal mở:", await page.getByText("Sửa buổi học").count());
await page.screenshot({ path: "smoke/13-session-editor.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// --- AI: dán ảnh bằng Ctrl+V ---
await page.getByRole("button", { name: "AI Inbox" }).first().click();
await page.waitForTimeout(500);
const b64 = readFileSync("smoke/notice.png").toString("base64");
await page.evaluate((data) => {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  const dt = new DataTransfer();
  dt.items.add(new File([blob], "notice.png", { type: "image/png" }));
  document.dispatchEvent(
    new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
  );
}, b64);
await page.waitForTimeout(800);
console.log("=== PASTE ===");
console.log("preview:", await page.locator('img[alt="Ảnh đã chọn"]').count());
console.log("toast:", await page.getByText("Đã dán ảnh từ clipboard").count());
await page.screenshot({ path: "smoke/14-ai-pasted.png" });

// --- AI đọc ảnh và trả tag ---
await page.getByRole("button", { name: /Đọc & tách công việc/ }).click();
await page.getByText("Cần bạn xác nhận", { exact: false }).waitFor({ timeout: 90_000 });
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Xác nhận thêm" }).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "smoke/15-ai-drafts-tags.png" });
const tagSelects = page.locator("select").filter({ hasText: "Lịch học" });
console.log("=== AI DRAFTS ===");
console.log("draft cards:", await page.locator("select").filter({ hasText: "Deadline" }).count());
console.log("tag selects:", await tagSelects.count());
const values = await tagSelects.evaluateAll((els) => els.map((e) => e.value));
console.log("tag values:", values);

// xác nhận mục đầu tiên
await page.getByRole("button", { name: "Xác nhận thêm" }).first().click();
await page.waitForTimeout(900);
console.log("toast added:", await page.getByText("Đã thêm vào lịch").count());

// --- kiểm tra item AI vừa thêm có tag ---
await page.getByRole("button", { name: "Tất cả", exact: true }).first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: "smoke/16-all-after-ai.png" });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
