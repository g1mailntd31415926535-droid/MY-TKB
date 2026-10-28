import { chromium } from "playwright-core";

/**
 * Mở trình duyệt cho script kiểm tra.
 * Mặc định dùng Edge đã cài trên máy (Windows có sẵn).
 * Đổi bằng biến môi trường:
 *   BROWSER_CHANNEL=chrome  — dùng Chrome đã cài
 *   BROWSER_PATH=/đường/dẫn — chỉ thẳng file chạy của trình duyệt
 */
export function launchBrowser() {
  const executablePath = process.env.BROWSER_PATH;
  return chromium.launch(
    executablePath ? { executablePath } : { channel: process.env.BROWSER_CHANNEL ?? "msedge" },
  );
}

/** Địa chỉ app đang chạy (mặc định vite dev). */
export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
