import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const base = "http://localhost:5173/?local=1";
await page.goto(base, { waitUntil: "networkidle" });

const snapshot = {
  settings: {
    semester: { name: "Học kỳ 1 · 2026–2027", start_date: "2026-08-31", total_weeks: 20 },
    periods: Array.from({ length: 12 }, (_, i) => {
      const base = i < 6 ? 7 * 60 : 12 * 60 + 45;
      const off = i < 6 ? i : i - 6;
      const s = base + off * 55;
      const p = (n) => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
      return { index: i + 1, start: p(s), end: p(s + 50) };
    }),
  },
  tags: [
    { id: "t1", name: "Lịch học", color: "#f5b301" },
    { id: "t2", name: "Activity", color: "#3b82f6" },
    { id: "t3", name: "Exam", color: "#22c55e" },
  ],
  subjects: [
    { id: "s1", code: "PH1120", name: "Vật lý đại cương II", color: "#f5b301", teacher: "Đào Tuấn Đạt" },
    { id: "s2", code: "IT3090", name: "Cơ sở dữ liệu", color: "#f5b301", teacher: "Nguyễn Văn A" },
  ],
  sessions: [
    { id: "se1", subject_id: "s1", day_of_week: 4, period_start: 3, period_end: 4, weeks_start: 1, weeks_end: 20, interval_weeks: 1, room: "D9-301", note: null, tag_id: "t1" },
    { id: "se2", subject_id: "s2", day_of_week: 4, period_start: 7, period_end: 9, weeks_start: 1, weeks_end: 20, interval_weeks: 1, room: "D9-101", note: null, tag_id: "t1" },
  ],
  entries: [
    {
      id: "e1",
      kind: "event",
      title: "DevFest Cloud Hanoi 2026",
      date: "2026-10-31",
      start_time: "13:00",
      end_time: "17:00",
      all_day: false,
      repeat_weekly: false,
      repeat_interval_weeks: 1,
      repeat_until: null,
      done: false,
      priority: "normal",
      subject_id: null,
      location: "Hội trường A",
      note: "Sự kiện công nghệ thường niên dành cho sinh viên",
      source: "manual",
      tag_id: "t2",
    },
    {
      id: "e2",
      kind: "event",
      title: "SieuTieuDeRatDaiKhongCoKhoangTrangABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      date: "2026-10-31",
      start_time: "18:00",
      end_time: "19:00",
      all_day: false,
      repeat_weekly: false,
      repeat_interval_weeks: 1,
      repeat_until: null,
      done: false,
      priority: "normal",
      subject_id: null,
      location: "PhongHocSieuDaiKhongCoKhoangTrangABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      note: "GhiChuSieuDaiKhongCoKhoangTrangABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      source: "manual",
      tag_id: "t3",
    },
  ],
  exceptions: [],
};

await page.evaluate((s) => {
  localStorage.setItem("track-tkb:v1", JSON.stringify(s));
  localStorage.setItem("track-tkb:mode", "local");
}, snapshot);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);

await page.getByRole("button", { name: "Thời khoá biểu", exact: true }).first().click();
await page.waitForTimeout(600);

const measure = async (label) => {
  const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    const wide = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 || r.right > vw + 1) {
        wide.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 90),
          w: Math.round(r.width),
          right: Math.round(r.right),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    });
    return {
      vw,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      mainScrollWidth: document.querySelector("main")?.scrollWidth,
      mainClientWidth: document.querySelector("main")?.clientWidth,
      wide: wide.slice(0, 12),
      wideCount: wide.length,
    };
  });
  console.log("===" + label + "===");
  console.log(JSON.stringify(out, null, 2));
};

await measure("MONTH INITIAL");
await page.screenshot({ path: "smoke/m1-month-initial.png", fullPage: false });

await page.locator('button[data-date="2026-10-31"]').click();
await page.waitForTimeout(600);
await measure("AFTER PICK 31");
await page.screenshot({ path: "smoke/m2-month-pick31.png", fullPage: false });

await page.locator("aside").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "smoke/m2b-detail.png", fullPage: false });

await page.setViewportSize({ width: 320, height: 700 });
await page.waitForTimeout(400);
await measure("AFTER 320PX");
await page.screenshot({ path: "smoke/m4-320.png", fullPage: false });

await page.setViewportSize({ width: 1440, height: 950 });
await page.evaluate(() => document.querySelector("main")?.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "smoke/m5-desktop.png", fullPage: false });

console.log("errors:", errors);
await browser.close();
