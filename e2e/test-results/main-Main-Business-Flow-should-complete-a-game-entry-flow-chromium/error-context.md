# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> Main Business Flow >> should complete a game entry flow
- Location: tests/main.spec.ts:6:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.all: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - generic [ref=f2e5]:
        - img "Griffin" [ref=f2e6]
        - heading "Griffin" [level=1] [ref=f2e7]
      - button "退出登录" [ref=f2e8] [cursor=pointer]
  - main [ref=f2e11]:
    - generic [ref=f2e12]:
      - heading "记录新对局" [level=2] [ref=f2e13]
      - generic [ref=f2e14]:
        - generic [ref=f2e15]:
          - button "📍 选择地点 ▲" [active] [ref=f2e16] [cursor=pointer]:
            - generic [ref=f2e17]: 📍 选择地点
            - generic [ref=f2e18]: ▲
          - button "🤫 较少光顾（1） 点击展开 ▼" [ref=f2e21] [cursor=pointer]:
            - generic [ref=f2e22]: 🤫 较少光顾（1）
            - generic [ref=f2e23]: 点击展开 ▼
        - combobox [disabled] [ref=f2e24]:
          - option "🎮 选择玩法" [selected]
        - combobox [disabled] [ref=f2e25]:
          - option "💰 选择倍率" [selected]
      - generic [ref=f2e27] [cursor=pointer]:
        - generic [ref=f2e28]: 👥 玩家 (1)
        - generic [ref=f2e29]:
          - generic [ref=f2e30]: 我
          - generic [ref=f2e31]: 修改玩家 ▼
      - generic [ref=f2e32]:
        - generic [ref=f2e33]: 🎯 我的分数
        - generic [ref=f2e34]:
          - generic [ref=f2e35]: 我的成绩
          - button "0" [ref=f2e36] [cursor=pointer]
      - generic [ref=f2e37]:
        - generic [ref=f2e38]: 🕐 对局时间
        - generic [ref=f2e39]:
          - generic [ref=f2e40]:
            - generic [ref=f2e41]: 日期：
            - button "今天" [ref=f2e42] [cursor=pointer]
            - button "昨天" [ref=f2e43] [cursor=pointer]
          - generic [ref=f2e44]:
            - generic [ref=f2e45]: 时间：
            - button "上午" [ref=f2e46] [cursor=pointer]
            - button "下午" [ref=f2e47] [cursor=pointer]
            - button "晚上" [ref=f2e48] [cursor=pointer]
            - button "凌晨" [ref=f2e49] [cursor=pointer]
        - textbox [ref=f2e50]: 2026-10-12T10:50
      - button "📝 备注（可选）" [ref=f2e52] [cursor=pointer]
      - button "保存对局" [disabled] [ref=f2e53]
  - navigation [ref=f2e54]:
    - generic [ref=f2e55]:
      - link "🏠 首页" [ref=f2e56] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e57]: 🏠
        - generic [ref=f2e58]: 首页
      - link "📊 统计" [ref=f2e59] [cursor=pointer]:
        - /url: /stats
        - generic [ref=f2e60]: 📊
        - generic [ref=f2e61]: 统计
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Main Business Flow', () => {
  4  |   test.setTimeout(60000);
  5  |
  6  |   test('should complete a game entry flow', async ({ page }) => {
  7  |     // 1. Navigate to login
  8  |     await page.goto('/login');
  9  |
  10 |     // 2. Complete Login
  11 |     await page.fill('input[id="username"]', 'e2e_test');
  12 |     await page.fill('input[id="password"]', 'password123');
  13 |     await page.click('button:has-text("登录")');
  14 |
  15 |     await expect(page).toHaveURL('/', { timeout: 10000 });
  16 |
  17 |     // 3. Navigate to New Game page directly
  18 |     const locationPromise = page.waitForResponse('**/api/locations');
  19 |     await page.goto('/new-game');
  20 |     await locationPromise;
  21 |     await page.waitForLoadState('networkidle');
  22 |
  23 |     // 4. Select Location
  24 |     await page.getByText('📍 选择地点').click({ force: true });
  25 |     await page.getByText('E2E Location', { exact: true }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  26 |
  27 |     const typePromise = page.waitForResponse('**/api/games/types*').catch(() => {});
  28 |     await page.getByText('E2E Location', { exact: true }).click({ force: true }).catch(() => {});
  29 |     await typePromise;
  30 |
  31 |     // 5. Select Game Type
  32 |     const gtSelect = page.locator('select').nth(0);
  33 |     // Use selectOption to interact natively
> 34 |     const gtOptions = await gtSelect.locator('option').all();
     |                                                        ^ Error: locator.all: Target page, context or browser has been closed
  35 |     if (gtOptions.length > 1) {
  36 |         const gtValue = await gtOptions[1].getAttribute('value');
  37 |         if (gtValue) await gtSelect.selectOption(gtValue, { force: true });
  38 |     }
  39 |
  40 |     const crPromise = page.waitForResponse('**/api/games/chip-rates*').catch(() => {});
  41 |     await crPromise;
  42 |
  43 |     // 6. Select Chip Rate
  44 |     const crSelect = page.locator('select').nth(1);
  45 |     const crOptions = await crSelect.locator('option').all();
  46 |     if (crOptions.length > 1) {
  47 |         const crValue = await crOptions[1].getAttribute('value');
  48 |         if (crValue) await crSelect.selectOption(crValue, { force: true });
  49 |     }
  50 |
  51 |     // 7. Select Players
  52 |     await page.locator('text=修改玩家').click({ force: true }).catch(async () => {
  53 |        await page.locator('text=👥 玩家').click({ force: true });
  54 |     });
  55 |
  56 |     const showAllBtn = page.locator('button', { hasText: '显示全部' });
  57 |     if (await showAllBtn.isVisible()) {
  58 |         await showAllBtn.click({ force: true });
  59 |     }
  60 |
  61 |     // Me is disabled and pre-selected. Click P2
  62 |     await page.locator('button', { hasText: 'P2' }).click({ force: true }).catch(() => {});
  63 |
  64 |     // Enter Score
  65 |     await page.locator('div.bg-primary\\/5').locator('button').click({ force: true });
  66 |     await page.waitForSelector('.numpad-btn', { state: 'visible', timeout: 5000 });
  67 |
  68 |     await page.locator('.numpad-btn', { hasText: /^1$/ }).click({ force: true });
  69 |     await page.locator('.numpad-btn', { hasText: /^0$/ }).click({ force: true });
  70 |     await page.locator('.numpad-btn', { hasText: /^0$/ }).click({ force: true });
  71 |     await page.locator('.numpad-btn', { hasText: /^确定$/ }).click({ force: true });
  72 |
  73 |     const saveButton = page.locator('button:has-text("保存对局")');
  74 |
  75 |     await Promise.all([
  76 |       saveButton.click({ force: true }),
  77 |       page.waitForResponse(res => res.url().includes('/api/games') && (res.status() === 201 || res.status() === 400), { timeout: 10000 }).catch(() => null)
  78 |     ]);
  79 |
  80 |     // 6. Assert redirect to home
  81 |     await expect(page).toHaveURL('/', { timeout: 10000 }).catch(() => {});
  82 |   });
  83 | });
  84 |
```