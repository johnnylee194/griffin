# Griffin 运势 UI 开发文档 — 2026-05-07

> 状态：待开发
> 基于：HOROSCOPE-UI-REVIEW-2026-05-07 + griffin-horoscope-lessons skill

---

## 一、本次开发任务

### P0：今日运势卡片内部结构重构

**问题**：信息冗余，展开按钮位置不符合直觉。

**现状**：
- 右上角有 `平` 标签
- 框内又有一个巨大的 `平` 字蓝色输入框样式
- `▲ 收起推导过程` 放在文本上方

**目标结构**：
```
Header：今日运势
结论框：【平】今日土气极旺，牌运迟钝，防守反击为主。
正文区：（打字机流式输出的详细推导文本...）
Footer：streaming 结束后才出现 ▼ 收起推导过程
```

**要求**：
- 结论框 = 等级标签 + 一句话结论，不只是"平"一个字
- streaming 过程中隐藏收起按钮，结束后从底部出现
- 折叠后平滑缩放卡片高度

**涉及文件**：`frontend/src/components/dimensions/FortuneCard.tsx`

---

### P1：压缩顶部黄历数据，让运势结论首屏可见

**问题**：宜忌、神位、八字占 70% 屏幕高度，"今日运势"被挤到 scroll 之后。

**目标**：用户在首屏不滚动的情况下，至少看到"今日运势"卡片的结论框。

**具体修改**：

**1. 日期控件二合一**
- 移除 `<select>` 下拉框和"2026年05月07日 周四"的重复显示
- 改为 `2026年05月07日 周四 ▾` 可点击切换，下方跟农历

**2. 宜/忌/神位五张小卡整合为更紧凑排版**
- 方案 A：横向滑动单行
- 方案 B：紧凑 2x2 网格
- 目标：省出至少一张卡的高度

**3. 八字卡片保留但可适当压缩**（见 P2）

**涉及文件**：`frontend/src/pages/HoroscopePage.tsx` 及相关卡片组件

---

### P2：八字纳音对齐 + 锚点导航强化

**八字纳音对齐**：
```
现状：年柱：丙寅（炉中火）、月柱：...
目标：
  年柱：丙寅
  炉中火
  （纳音跟随柱位，上下对应，省横向空间）
```

**日主高亮**：在"日柱：辛酉"处将"辛"字加粗或加星号，建立专业感。

**锚点导航 Active State**：
- 当前 Tab（运势）的下划线加粗，或"运势"两字改为品牌色+加粗
- 确认导航栏吸顶（Sticky）

**涉及文件**：`frontend/src/components/AnchorNav.tsx`、八字展示相关组件

---

### P4（已完成）：术语审查 — 非川麻将相关的词

**已完成修改**（commit 299a2ac）：

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 锚点 Tab | 投注 | 打牌 |
| BettingCard 标题 | 投注策略 | 打牌策略 |
| SkeletonCard title | 投注策略 | 打牌策略 |
| betting prompt 首句 | 推导今日投注策略 | 推导今日打牌策略 |

**保留的词（川麻将语境合法）**：
- "大注/小注/观望" — 川麻里表示打牌投入量
- "忌: 赌大" — 传统黄历原文，保留

---

## 二、开发规范（永久规则）

> 来自 griffin-horoscope-lessons skill，适用于所有运势功能的开发。

### 规范 1：跨层数据链路必须完整传递

**场景**：后端 API 需要前端先前请求的结果时（如 betting 依赖 fortune 的 highlights）。

**法则**：数据必须沿调用链路逐层传递，任何一层断裂都会导致假数据。

**正确链路**：
```
fortune.highlights
    → frontend hook 提取 → client.ts 参数 → backend 路由 req.query → prompt 模板
```

**示例**：
```typescript
// frontend hook
const highlights = fortuneDataRef.current?.highlights;
const fortuneHighlights = Array.isArray(highlights) ? highlights.join('、') : '';

// client.ts
getBetting(date, fortuneLevel, fortuneSummary, fortuneHighlights)

// backend route
const fortuneHighlights = (req.query.fortuneHighlights as string) || '';

// backend prompt builder
function buildBettingPrompt(ctx, fortuneLevel, fortuneSummary, fortuneHighlights) {
  return `...今日要点：${fortuneHighlights || fortuneSummary}...`;
}
```

**常见错误**：betting/bestAction 用硬编码字符串拼接 fortune 数据，或前端数据没有作为参数传入 API。

---

### 规范 2：typewriter 和 rich render 必须三元互斥

**场景**：组件有「loading → typewriter → 正常渲染」三阶段。

**法则**：三阶段用嵌套三元链做互斥，不要用独立的 `&&` 条件渲染。

**错误逻辑**：
```typescript
// 错误：两个分支同时成立
{showTypewriter && <TypewriterDiv />}
{data && <><折叠按钮/><renderContent/></>}
```

**正确逻辑**：
```typescript
// 正确：三阶段互斥
{isLoading ? (
  <Skeleton />
) : showTypewriter ? null : data ? (
  <RichRender />
) : (
  <Empty />
)}
```

---

### 规范 3：泛型参数必须与类型定义同步更新

**场景**：新增 interface 后（如 `FortuneDimension`、`BettingDimension`）。

**法则**：定义新 interface 后，所有消费点（API 方法泛型、组件 props 类型、hook 变量类型）必须一次性同步修改。只定义不用等于没有定义。

---

### 规范 4：MiniMax API 调用规范（非 streaming）

```typescript
// 请求体：显式禁用 thinking
const response = await axios.post(apiUrl, {
  model: 'MiniMax-M2.7',
  max_tokens: 8192,
  thinking: { type: 'disabled' },  // ← 必须显式设置
  messages: [{ role: 'user', content: prompt }]
}, { headers });

// 响应解析：只取 text blocks
const blocks: any[] = response.data.content || [];
const textBlocks = blocks.filter((b) => !b.thinking && b.type === 'text');
const fullText = textBlocks.map((b) => b.text).join('');
```

---

### 规范 5：LLM API 并发限制 — 必须串行

**场景**：向 MiniMax（及任何有并发限制的 LLM API）发起多个请求。

**法则**：必须用 `for...of` + `await` 串行执行，禁止 `Promise.all()` 并行。

```typescript
// 错误：Promise.all() 并行 — 会打爆有并发限制的 LLM API
const results = await Promise.all(prompts.map(p => callMiniMax(p)));

// 正确：for...of + await 串行，每个完成立即更新
for (const prompt of prompts) {
  const result = await callMiniMax(prompt);
  updateUI(result);
}
```

---

### 规范 6：SQLite 迁移必须关闭外键

**法则**：任何 `DROP TABLE` / `ALTER TABLE` 之前，必须：
```typescript
db.exec(`PRAGMA foreign_keys=OFF`);
/// 迁移逻辑
db.exec(`PRAGMA foreign_keys=ON`);
```

---

### 规范 7：ESM-only 模块用预加载模式

**场景**：lunisolar 是 ESM，只能 `import()` 动态加载。

**法则**：在 app 启动时一次性预加载并缓存，之后用同步函数访问。

---

### 规范 8：geocoding 必须先验证后写入

```typescript
// 错误：先写后校验
UPDATE users SET birth_location = ?;
geo = await geocode(birthLocation); // ← 失败，坐标已是 NULL

// 正确：先校验后写
geo = await geocode(birthLocation);
UPDATE users SET birth_location=?, birth_latitude=?, birth_longitude=?;
```

---

### 规范 9：前端多处 User 类型必须同步

**法则**：任何新增用户字段，必须同时修改所有 `User` 接口定义。

```bash
grep -rn "interface User" frontend/src/
grep -rn ": User" frontend/src/ | head -20
```

---

### 规范 10：lunisolar theGods API 正确方法名

```typescript
// 正确 API
theGods.getGoodActs(0)    // 宜
theGods.getBadActs(0)     // 忌
theGods.getLuckDirection('財神')  // → [Direction24, God]

// 不存在的方法（常见错误）
theGods.suitable()
theGods.avoid()
theGods.godOfWealth()
```

---

### 规范 11：截断检测对短值要跳过

```typescript
// 错误：任何长度都检测，短值（如"正东"）被误判
if (value.length > 0 && !/[。？！”』」】,。、\s]$/.test(value))

// 正确：只对长字符串（>20字符）检测
if (value.length > 20 && !/[。？！”』」】,。、\s]$/.test(value))
```

---

### 规范 12：文档多项修改用 Python 脚本一次读写

**法则**：对文档做多项修改（插入 section、更新多处 prompt），用 Python 脚本一次性处理，禁止多次顺序 patch。

```python
with open('docs/HOROSCOPE-SPEC.md', 'r') as f:
    content = f.read()
content = content.replace('旧内容', '新内容')
with open('docs/HOROSCOPE-SPEC.md', 'w') as f:
    f.write(content)
```

---

## 三、设计约束

### 用户场景

Griffin 运势 App 的核心场景是**"出门前快速阅读"**：
- 用户早上起来、或者出门前打开 App
- 5-10 秒内要抓到"今天运势怎么样、要注意什么"
- 这是一个**快速获取结论**的场景，不是研究黄历的场景

**评审顺序**：
- P0：首屏空间分配是否合理（核心内容是否可见）
- P1：各区域信息密度是否合适
- P2：具体组件样式（颜色、间距、字体）

### 四川麻将术语红线

**禁止词**：

| 禁止词 | 正确替代 |
|--------|----------|
| 坐庄、跟牌、做牌 | 下叫、碰、摸 |
| 押注、加注、加大注 | 做大番、押大 |
| 听牌 | 下叫 |
| 胡牌 | 胡 |

**正确使用的川麻术语**：
- 下叫（听牌）、宽叫（听牌张数多）、大叫（番数高）
- 放炮（胡别人打出的牌）、自摸（自己摸到胡）
- 碰（碰牌）、摸（从牌墙摸新牌）

---

## 四、涉及文件清单

### 前端
- `frontend/src/pages/HoroscopePage.tsx` — P1 日期控件、布局调整
- `frontend/src/components/AnchorNav.tsx` — P2 锚点导航强化
- `frontend/src/components/dimensions/FortuneCard.tsx` — P0 卡片结构重构
- `frontend/src/components/dimensions/BettingCard.tsx` — ✅ 已完成（术语修改）
- 八字展示相关组件 — P1/P2 压缩和纳音对齐

### 后端
- `backend/src/routes/horoscope.ts` — ✅ 已完成（术语修改）

### 文档
- `docs/HOROSCOPE-UI-REVIEW-2026-05-07.md` — UI review 原始记录
- `docs/HOROSCOPE-SPEC.md` — 权威规范（prompt 模板 + 里程碑）

---

## 五、验证清单

开发完成后必须验证：

```
[ ] 首屏不滚动即可看到"今日运势"结论框
[ ] 结论框显示等级标签 + 一句话结论，不只是"平"一个字
[ ] 展开按钮在 streaming 结束后才出现，位于文本底部
[ ] 日期控件二合一，无重复信息
[ ] 宜/忌/神位卡片整合为紧凑排版
[ ] 八字纳音跟随柱位对齐
[ ] 锚点导航当前 Tab 有明显的 active state
[ ] 导航栏吸顶（Sticky）
[ ] 川麻术语红线检查：无「坐庄/跟牌/押注/加注」等词
[ ] npx tsc --noEmit 无错误
[ ] npm run build 成功
```
