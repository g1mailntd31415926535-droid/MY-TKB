import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "smoke/08-login.png" });

const hasLogin = await page.getByText("Đăng nhập bằng tài khoản đã tạo trong Supabase Auth.").count();
console.log("màn đăng nhập:", hasLogin > 0);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO_RUNTIME_ERRORS");
await browser.close();
