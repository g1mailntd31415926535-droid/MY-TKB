import { launchBrowser, BASE_URL } from "./lib/browser.mjs";

const browser = await launchBrowser();

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto(BASE_URL + "/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const title = () => page.getByRole("main").locator("section").first().locator("h2").first().textContent();
console.log("month:", await title());

await page.getByRole("button", { name: "22", exact: true }).first().click();
await page.waitForTimeout(300);
console.log("detail items 22:", await page.getByRole("main").locator("aside").locator("button").count());
await page.screenshot({ path: "smoke/60-final-month.png", fullPage: true });

// Đổi tháng bằng select
const nextMonth = await page.evaluate(() => {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
});
await page.getByRole("main").locator("select").selectOption(nextMonth);
await page.waitForTimeout(300);
console.log("after select:", await title());
await page.getByRole("main").getByRole("button", { name: "Hôm nay", exact: true }).click();
await page.waitForTimeout(300);

// Lọc nhóm Hoạt động
await page.getByRole("main").getByRole("button", { name: "Hoạt động", exact: true }).click();
await page.waitForTimeout(300);
console.log("filter Hoạt động, items 22:", await page.getByRole("main").locator("aside").locator("button").count());
await page.screenshot({ path: "smoke/61-final-filter.png" });
await page.getByRole("main").getByRole("button", { name: "Tất cả", exact: true }).click();
await page.waitForTimeout(200);

// Chi tiết
await page.getByLabel("Chi tiết").check();
await page.waitForTimeout(400);
await page.screenshot({ path: "smoke/62-final-detail.png", fullPage: true });

// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.getByLabel("Lịch").check();
await page.waitForTimeout(300);
await page.screenshot({ path: "smoke/63-final-mobile.png", fullPage: true });

const overflow = await page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  inner: window.innerWidth,
}));
console.log("mobile overflow:", overflow);

const navBoxes = await page.locator("header nav button").evaluateAll((els) =>
  els.map((el) => ({ text: el.textContent?.trim(), right: el.getBoundingClientRect().right })),
);
console.log("nav:", navBoxes);

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
