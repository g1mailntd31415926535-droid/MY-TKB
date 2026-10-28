import { launchBrowser, BASE_URL } from "./lib/browser.mjs";

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
const overflow = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto(BASE_URL + "/?local=1", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const snapshot = {
  settings: {
    semester: { name: "Học kỳ 1 · 2026–2027", start_date: "2026-08-31", total_weeks: 20 },
    periods: Array.from({ length: 12 }, (_, i) => {
      const base = i < 6 ? 7 * 60 : 12 * 60 + 45;
      const off = i < 6 ? i : i - 6;
      const s = base + off * 55;
      const p = (n) =>
        String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
      return { index: i + 1, start: p(s), end: p(s + 50) };
    }),
  },
  tags: [
    { id: "t1", name: "Lịch học", color: "#f5b301" },
    { id: "t2", name: "Activity", color: "#3b82f6" },
    { id: "t3", name: "Exam", color: "#22c55e" },
  ],
  subjects: [
    {
      id: "s1",
      code: "PH1120",
      name: "Vật lý đại cương II",
      color: "#f5b301",
      teacher: "Đào Tuấn Đạt",
    },
    { id: "s2", code: "IT3090", name: "Cơ sở dữ liệu", color: "#f5b301", teacher: null },
  ],
  sessions: [
    {
      id: "se1",
      subject_id: "s1",
      day_of_week: new Date().getDay() === 0 ? 7 : new Date().getDay(),
      period_start: 3,
      period_end: 4,
      weeks_start: 1,
      weeks_end: 20,
      interval_weeks: 1,
      room: "D9-301",
      note: null,
      tag_id: "t1",
    },
    {
      id: "se2",
      subject_id: "s2",
      day_of_week: new Date().getDay() === 0 ? 7 : new Date().getDay(),
      period_start: 7,
      period_end: 9,
      weeks_start: 1,
      weeks_end: 20,
      interval_weeks: 1,
      room: "D9-101",
      note: null,
      tag_id: "t1",
    },
  ],
  entries: [
    {
      id: "e1",
      kind: "deadline",
      title: "Nộp báo cáo bài tập lớn Giải tích",
      date: new Date().toISOString().slice(0, 10),
      start_time: "23:59",
      end_time: null,
      all_day: false,
      repeat_weekly: false,
      repeat_interval_weeks: 1,
      repeat_until: null,
      done: false,
      priority: "high",
      subject_id: null,
      location: null,
      note: null,
      source: "manual",
      tag_id: "t3",
    },
    {
      id: "e2",
      kind: "event",
      title: "Họp nhóm đồ án OOP",
      date: new Date().toISOString().slice(0, 10),
      start_time: "20:00",
      end_time: "21:30",
      all_day: false,
      repeat_weekly: true,
      repeat_interval_weeks: 2,
      repeat_until: null,
      done: false,
      priority: "normal",
      subject_id: null,
      location: "Google Meet",
      note: "Chuẩn bị slide demo",
      source: "manual",
      tag_id: "t2",
    },
  ],
  exceptions: [],
};

await page.evaluate((s) => {
  localStorage.setItem("track-tkb:v1", JSON.stringify(s));
  localStorage.setItem("track-tkb:mode", "local");
}, snapshot);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

const measure = async (label, file) => {
  const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    const wide = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 || r.right > vw + 1) {
        wide.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70) });
      }
    });
    return {
      vw,
      scroll: document.documentElement.scrollWidth,
      mainScroll: document.querySelector("main")?.scrollWidth,
      wideCount: wide.length,
      wide: wide.slice(0, 6),
    };
  });
  console.log("===" + label + "===", JSON.stringify(out));
  if (out.scroll > out.vw || out.wideCount > 0) overflow.push(label);
  await page.screenshot({ path: file, fullPage: false });
};

const go = async (label) => {
  await page.getByRole("button", { name: label, exact: true }).first().click();
  await page.waitForTimeout(600);
};

await go("Hôm nay");
await measure("TODAY", "smoke/p1-today.png");
await go("Thời khoá biểu");
await measure("MONTH", "smoke/p2-month.png");
await go("Tất cả");
await measure("ALL", "smoke/p3-all.png");
await go("AI Inbox");
await measure("AI", "smoke/p4-ai.png");
await go("Cài đặt");
await measure("SETTINGS", "smoke/p5-settings.png");

console.log("errors:", errors.length ? errors : "none");
console.log("tràn ngang:", overflow.length ? overflow : "none");
await browser.close();
process.exit(errors.length || overflow.length ? 1 : 0);
