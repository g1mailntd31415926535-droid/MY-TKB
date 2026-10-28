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
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

await page.goto(BASE_URL + "/?local=1", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /^(Thời khoá biểu|TKB)$/ }).locator("visible=true").first().click();
await page.waitForTimeout(500);

// Phát TouchEvent ngay trên ô lịch để React nhận như ngón tay thật
const swipe = async (fromX, toX, fromY = 400, toY = 400) => {
  await page.evaluate(
    ([fromX, toX, fromY, toY]) => {
      const target = document.elementFromPoint(fromX, fromY);
      const touch = (x, y) =>
        new Touch({ identifier: 1, target, clientX: x, clientY: y });
      const fire = (type, x, y) => {
        const t = touch(x, y);
        const list = type === "touchend" ? [] : [t];
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: list,
            targetTouches: list,
            changedTouches: [t],
          }),
        );
      };
      fire("touchstart", fromX, fromY);
      fire("touchmove", (fromX + toX) / 2, (fromY + toY) / 2);
      fire("touchend", toX, toY);
    },
    [fromX, toX, fromY, toY],
  );
  await page.waitForTimeout(350);
};
const month = () => page.locator("main select").first().inputValue();

const start = await month();
await swipe(320, 80);
const afterLeft = await month();
await swipe(80, 320);
const afterRight = await month();
await swipe(200, 210, 300, 600); // vuốt dọc: không đổi tháng
const afterVertical = await month();

console.log("start:", start);
console.log("vuốt trái →", afterLeft);
console.log("vuốt phải →", afterRight);
console.log("vuốt dọc →", afterVertical);
const ok = afterLeft > start && afterRight === start && afterVertical === start;
console.log(ok ? "OK" : "FAIL");
console.log("errors:", errors.length ? errors : "none");

await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
