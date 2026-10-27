import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";

mkdirSync("smoke", { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 720, height: 620 }, deviceScaleFactor: 2 });

await page.setContent(`
  <html lang="vi"><body style="margin:0;background:#f7f5ef;font-family:Arial,sans-serif;padding:28px;color:#1a1a1a">
    <div style="border:2px solid #1a1a1a;padding:20px;border-radius:6px">
      <h2 style="margin:0 0 4px;text-align:center;letter-spacing:1px">THÔNG BÁO CÔNG VIỆC TUẦN NÀY</h2>
      <p style="text-align:center;margin:0 0 16px;font-size:13px;color:#555">Lớp INT2204 — Nhóm 4</p>
      <ul style="font-size:16px;line-height:1.7;margin:0;padding-left:22px">
        <li>Thứ 6 ngày 30/10/2026, <b>14h00–16h30</b>: họp nhóm đồ án tại phòng <b>B1-210</b>, mang theo bản in use-case.</li>
        <li>Chủ nhật 01/11/2026: <b>nộp báo cáo giữa kỳ môn Giải tích trước 23h59</b> trên hệ thống.</li>
        <li>Thứ 4 tuần sau: seminar "Kỹ năng viết CV" lúc 9h sáng, hội trường A.</li>
      </ul>
    </div>
  </body></html>
`);

await page.screenshot({ path: "smoke/notice.png", fullPage: true });
await browser.close();

const b64 = readFileSync("smoke/notice.png").toString("base64");
const res = await fetch("http://127.0.0.1:8787/api/ai/extract", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ imageBase64: b64, mimeType: "image/png" }),
});
const json = await res.json();
console.log("HTTP", res.status);
console.log(JSON.stringify(json, null, 2));
