# Griffin Horoscope Phase 3 开发文档

> 状态：Partially Implemented（部分完成）
> 生成日期：2026-05-06
> 最后更新：2026-05-07
> 当前 HEAD：fc45524

---

## 文档导航

- **SPEC**：`docs/HOROSCOPE-SPEC.md`（总纲，里程碑追踪）
- **设计上下文**：`docs/HOROSCOPE-DESIGN-CONTEXT.md`（7维度详情 + 用户数据 + 设计方案）
- **避坑规则**：`griffin-horoscope-lessons` skill（SQLite迁移、ESM模块、geocoding、User类型同步等）
- **Phase 1/2 经验**：`griffin-horoscope-dev` skill

---

## 1. 核心约束（强制遵守）

### 1.1 实际实现：串行请求 + 非 streaming

**已实现：**
- 7个维度使用 `for...of` + `await` 串行请求（不是并行）
- 非 streaming 模式（MiniMax M2.7 SSE 截断 bug）
- 前端骨架屏立即渲染，请求完成后直接显示完整内容（typewriter 效果未实现）

**设计目标（未完成）：**
```
前端行为（设计目标）：
1. 进入页面 → 立即渲染7张卡片骨架（Skeleton）
2. 7个 API 同时请求（并行，不等待）
3. fortune 第一个返回 → typewriter 效果输出到卡片1
4. fortune 输出完毕 → 立即开始 betting 的 typewriter
5. betting 输出完毕 → 开始 bestAction
6. 以此类推：direction → goldenTime → conflictWarning → luckEnhancement
7. 全部完成后 → 底部显示"今日运势已为您推演完毕"
```

**防抖动规则：**
- 每个卡片的容器高度用 `transition: height 300ms ease` 动画变化
- 当卡片内容增加时，下方卡片平滑下推，不跳屏
- 如果用户已滚动到下方卡片，上方卡片的高度变化不强制滚回（静默处理）

### 1.2 MiniMax API 调用规范（非 streaming）

**Phase 3 所有维度 prompt 均使用非 streaming 调用（streaming 因 MiniMax M2.7 SSE 截断 bug 暂停）。**

```typescript
// 请求体：显式禁用 thinking
const response = await axios.post(apiUrl, {
  model: 'MiniMax-M2.7',
  max_tokens: 8192,
  thinking: { type: 'disabled' },  // ← 必须显式禁用
  messages: [{ role: 'user', content: prompt }]
}, { headers });

// 响应解析：只取 text blocks
const blocks: any[] = response.data.content || [];
const textBlocks = blocks.filter((b) => !b.thinking && b.type === 'text');
const fullText = textBlocks.map((b) => b.text).join('');
```

> 参考 `griffin-horoscope-lessons` skill 中的 MiniMax API 关键修复。

### 1.3 四川麻将术语红线

**以下词汇禁止在任何 prompt 或输出中出现：**

| 禁止词 | 正确替代 |
|--------|----------|
| 坐庄、跟牌、做牌 | 下叫、碰、摸 |
| 押注、加注、加大注 | 做大番、押大 |
| 听牌 | 下叫 |
| 胡牌 | 胡 |

**以下词汇正确使用：**
- 下叫（听牌）、宽叫（听牌张数多）、大叫（番数高）
- 放炮（胡别人打出的牌）、自摸（自己摸到胡）
- 碰（碰牌）、摸（从牌墙摸新牌）

### 1.4 用户数据（示例用 Johnny 真实八字）

```
年柱：丙午（火马）
月柱：癸巳（水蛇）
日柱：庚辰（金龙）
时柱：癸未（水羊）
日主：庚金
空亡：申酉
五行：火2、水3、金2、土2、木0（缺木）
日支辰被：戌冲、丑破、卯害
```

---

## 2. 页面结构

### 2.1 整体布局

```
┌─────────────────────────────────────┐
│ [锚点导航栏 - 横向滚动]              │
│ [运势][投注][决策][方位][时段][警示][开运] │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度1: fortune（今日运势）    │    │
│ │ 卡片（可折叠/展开）           │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度2: betting（投注策略）    │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度3: bestAction（麻将决策） │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度4: direction（方位）      │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度5: goldenTime（黄金时段） │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度6: conflictWarning      │    │
│ │ （冲煞空亡）                 │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 维度7: luckEnhancement      │    │
│ │ （开运清单）                 │    │
│ └─────────────────────────────┘    │
│                                     │
│ [全部完成后：底部提示]              │
└─────────────────────────────────────┘
```

### 2.2 锚点导航

页面顶部固定导航栏，横向可滑动。点击跳转到对应维度卡片（smooth scroll）。

### 2.3 卡片内部结构

每张卡片包含：

```
┌─────────────────────────────────────┐
│ [维度标题]                [状态标签]│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        结论高亮区（默认可见）     │ │
│ │  "旺" / "小注" / "★★★★★" 等    │ │
│ └─────────────────────────────────┘ │
│                                     │
│     ▼ 点击展开推导过程               │
│ ┌─────────────────────────────────┐ │
│ │        推导正文（折叠）           │ │
│ │ 三步推导 / 五行分析 / 具体影响    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**默认状态：**
- fortune/betting/bestAction → 卡片展开（核心决策维度）
- direction/goldenTime/conflictWarning/luckEnhancement → 卡片折叠（次要参考维度）

用户可手动展开/折叠任何卡片。

---

## 3. 各维度交互规范

### 3.1 fortune（今日运势）

**卡片状态**：默认展开（核心维度）
**内容层级**：
1. 结论高亮区：旺/平/弱 + 一句话
2. 推导正文（折叠，点击展开）：
   - 第一步：你的八字事实
   - 第二步：今天的事实
   - 第三步：叠加推导
   - 结论（重复结论）

**排版要求**：
- 三步推导用左侧 `3px solid var(--accent)` 边框引用块
- 重点字眼加粗（如 **庚金身弱**、**土太旺**、**甲木破印**）
- 行距 1.6，适合长文阅读

**prompt 输出**：直接输出长 narrative text，不需要输出 JSON 结构。

---

### 3.2 betting（投注策略）

**卡片状态**：默认展开
**内容层级**：
1. 结论高亮区：大注 / 小注 / 观望（字号加大）
2. 推导正文（折叠）：能量水平 → 十神财运型 → 纳音质感 → 麻将连接

**prompt 共用**：betting prompt 应在系统 prompt 中包含 fortune 的 derivation 结论，供 AI 参考。不需要重新计算八字。

---

### 3.3 bestAction（麻将决策）

**卡片状态**：默认展开
**内容层级**：
1. 结论高亮区（5个场景的简要结论）
2. 推导正文（折叠，定义列表格式）：

```
【下叫决策】
结论：宽叫优先
推导：...（先讲麻将事实 → 八字/能量如何影响）

【碰 vs 摸】
结论：该碰
推导：...

【放炮 vs 自摸】
结论：放炮就胡
推导：...

【对手方位】
结论：防南位
推导：...

【收官策略】
结论：见好就收
推导：...
```

**术语高亮**：川麻术语（宽叫、放炮、自摸、碰、摸）用主题色高亮。

---

### 3.4 direction（方位）

**卡片状态**：默认折叠
**内容层级**：
1. 结论高亮区：利哪个位置、忌哪个位置（一句话）
2. 推导正文（折叠，两区分块）：

```
【各位置策略】
坐北位：...
坐东位：...
坐南位：...
坐西位：...

【上下家对家克防】
🔴 防对家（南）：火克金...
🟢 不防上家（东）：木被你所制...
```

**克防关系用 emoji 颜色区分**：🔴 防（危险）、🟡 慎（注意）、🟢 不防（安全）

---

### 3.5 goldenTime（黄金时段）

**卡片状态**：默认折叠
**内容层级**：
1. 结论高亮区：最优3时段 + 最差3时段 + 趋势（一句话）
2. 推导正文（折叠，flex 列表）：

```
子 23-01  水  ★★★  水泄金气，平稳
丑 01-03  土  ★★   土过旺，保守
寅 03-05  木  ★★★  运气回升
...
酉 17-19  金  ★★★★★ 日主本气，全力出击
```

**星级用 `★` 符号**，不用 emoji 或数字。

**当前时辰高亮**：用 `background: var(--highlight)` 背景色标注。

---

### 3.6 conflictWarning（冲煞空亡）

**卡片状态**：默认折叠
**内容层级**：
1. 结论高亮区：今日核心风险（一句话）
2. 推导正文（折叠，alert box 样式）：

```
┌─────────────────────────────────────┐
│ ⚠️ 冲破害空亡，四重压力              │
├─────────────────────────────────────┤
│ 辰戌冲：                            │
│ 冲意味着...对打牌的具体影响...      │
│                                     │
│ 辰丑破：                            │
│ 破意味着...                         │
│                                     │
│ 卯辰害：                            │
│ 害意味着...                         │
│                                     │
│ 申酉空亡：                          │
│ 空亡意味着...                       │
│                                     │
│ 【麻将警示】                        │
│ · ...                               │
│ · ...                               │
└─────────────────────────────────────┘
```

**alert box 样式**：淡橙/淡红背景 `background: rgba(255, 100, 50, 0.05)`，左侧 `3px solid var(--warning)` 边框。

---

### 3.7 luckEnhancement（开运清单）

**卡片状态**：默认折叠
**内容层级**：
1. 结论高亮区：今天核心策略（一句话）
2. 推导正文（折叠，三分栏）：

```
【饮品】
✅ 宜：菊花茶/绿茶（木气，借甲木之力）
✅ 可选：矿泉水/气泡水
❌ 忌：红茶/普洱（土气，火上浇油）
⚠️ 少喝：可乐/红牛

【穿着颜色】
✅ 宜：绿色/青色
⚡ 点缀：红色
⚠️ 备选：黑色/蓝色
❌ 忌：白色/银色

【饰品】
✅ 宜：木制手串/翡翠绿松石
❌ 忌：金属手镯/银饰
```

**Emoji 规范**：`✅` 宜、`❌` 忌、`⚡` 点缀/少喝、`⚠️` 备选

---

## 4. API 设计

### 4.1 后端路由

```
GET  /api/horoscope/:date
  → 返回7个维度的完整数据（结构化 JSON，非 streaming）

GET  /api/horoscope/:date/fortune
GET  /api/horoscope/:date/betting
GET  /api/horoscope/:date/best-action
GET  /api/horoscope/:date/direction
GET  /api/horoscope/:date/golden-time
GET  /api/horoscope/:date/conflict-warning
GET  /api/horoscope/:date/luck-enhancement
  → 各自独立返回，用于前端按需请求
```

> **注意**：Phase 2 的 `/api/horoscope/stream/:date` SSE 端点暂时保留，但 Phase 3 不使用 streaming。所有维度数据通过非 streaming API 获取。

### 4.2 前端请求策略

```typescript
// 页面加载时，并行请求所有7个维度
const requests = [
  fetch('/api/horoscope/:date/fortune'),
  fetch('/api/horoscope/:date/betting'),
  fetch('/api/horoscope/:date/best-action'),
  fetch('/api/horoscope/:date/direction'),
  fetch('/api/horoscope/:date/golden-time'),
  fetch('/api/horoscope/:date/conflict-warning'),
  fetch('/api/horogram/:date/luck-enhancement'), // typo fixed
];

const results = await Promise.all(requests);
// results[0] → fortune, results[1] → betting, ...

// streaming 展示顺序控制：
// fortune 先展示，其他保持 skeleton
// 每完成一个，展示下一个
```

### 4.3 响应格式

```json
{
  "dimension": "fortune",
  "level": "旺",
  "summary": "今天状态不错，敢冲但别贪",
  "content": "第一步：你的八字事实\n你是庚金日主...",
  "derivation": {
    "step1": "...",
    "step2": "...",
    "step3": "..."
  },
  "conclusion": "旺 — ..."
}
```

> `content` 是长 narrative text，用于 typewriter 效果渲染。
> `derivation` 是结构化字段（可选），用于某些维度需要分开展示推导步骤。

---

## 6. 前端组件结构

### 6.1 组件列表

```
HoroscopePage/
├── HoroscopePage.tsx          # 主页面容器
├── components/
│   ├── DimensionCard.tsx      # 通用卡片组件（标题、状态、折叠/展开）
│   ├── AnchorNav.tsx          # 锚点导航栏
│   ├── SkeletonCard.tsx       # 骨架屏卡片
│   └── DoneFooter.tsx         # 完成后底部提示
├── dimensions/
│   ├── FortuneCard.tsx        # 维度1：今日运势
│   ├── BettingCard.tsx        # 维度2：投注策略
│   ├── BestActionCard.tsx      # 维度3：麻将决策
│   ├── DirectionCard.tsx      # 维度4：方位
│   ├── GoldenTimeCard.tsx     # 维度5：黄金时段
│   ├── ConflictWarningCard.tsx # 维度6：冲煞空亡
│   └── LuckEnhancementCard.tsx # 维度7：开运清单
└── hooks/
    ├── useHoroscopeData.ts    # 并行获取7维度数据
    └── useStreamingShow.ts    # 控制串行展示顺序
```

### 5.2 DimensionCard 折叠逻辑

```typescript
interface DimensionCardProps {
  title: string;
  status?: string;  // "旺" / "小注" / "★★★★★" 等
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

// 默认展开：fortune, betting, bestAction
// 默认折叠：direction, goldenTime, conflictWarning, luckEnhancement
```

### 5.3 Typewriter 效果

每个卡片的内容用 typewriter 效果逐字显示：

```typescript
// 简单的逐字显示
function useTypewriter(text: string, speed: number = 30) {
  const [displayed, setDisplayed] = useState('');
  // 逐字追加，每字 speed ms
}

// 卡片3输出完毕后，卡片4开始输出
// 用 Promise + queue 控制顺序
```

---

## 5. Response Schema（API 返回格式）

> 所有维度 API 返回统一 `HoroscopeDimension` 结构。数据库存 `result_json` 字段（JSON 字符串），格式如下。

```typescript
interface HoroscopeDimension {
  dimension: string;   // 维度名，如 'fortune', 'betting'
  level: string;      // 结论级别（前端渲染标签用）
  summary: string;    // 简短摘要（50-100字）
  content: string;    // 完整解读（长文本）
  [key: string]: any; // 各维度特有字段
}
```

### 5.1 fortune（综合运势）

```json
{
  "dimension": "fortune",
  "level": "旺",
  "summary": "今日金气旺盛，日主庚金得令，整体运势上佳",
  "content": "第一步：你的八字事实\n日主庚金在天干...",
  "highlights": ["金气旺", "宜主动出击", "财运佳"]
}
```

**字段说明：**
- `level`: 旺/平/弱
- `highlights`: 今日要点列表（供前端 bullet points 渲染）

### 5.2 betting（投注策略）

```json
{
  "dimension": "betting",
  "level": "大注",
  "summary": "金气旺盛，能量大，适合宽叫博大",
  "content": "推导过程...\n结论：...",
  "reason": "金气旺盛，能量大",
  "strategy": "宽叫为主，适时自摸"
}
```

**字段说明：**
- `level`: 大注/小注/观望
- `reason`: 一句话理由
- `strategy`: 核心策略（宽叫/小注/观望优先）

### 5.3 bestAction（麻将决策）

```json
{
  "dimension": "bestAction",
  "level": "参考",
  "summary": "今日5大场景决策建议已生成",
  "content": "完整解读...",
  "scenarios": [
    { "scene": "下叫决策", "conclusion": "宽叫优先", "reasoning": "金气旺适合做大番..." },
    { "scene": "碰 vs 摸", "conclusion": "多摸少碰", "reasoning": "..." },
    { "scene": "放炮 vs 自摸", "conclusion": "优先自摸", "reasoning": "..." },
    { "scene": "对手方位", "conclusion": "防北位", "reasoning": "..." },
    { "scene": "收官策略", "conclusion": "见好就收", "reasoning": "..." }
  ]
}
```

**字段说明：**
- `scenarios[].scene`: 场景名（固定5个）
- `scenarios[].conclusion`: 结论（10字以内）
- `scenarios[].reasoning`: 推导过程

### 5.4 direction（方位策略）

```json
{
  "dimension": "direction",
  "level": "方位参考",
  "summary": "坐北最佳，防西位对家",
  "content": "完整解读...",
  "positions": {
    "north": { "strategy": "坐北最佳", "caution": "防上家东位", "risk": "green" },
    "east": { "strategy": "坐东较稳", "caution": "忌贪", "risk": "green" },
    "south": { "strategy": "坐南激进", "caution": "防对家", "risk": "yellow" },
    "west": { "strategy": "坐西保守", "caution": "宜观望", "risk": "red" }
  }
}
```

**字段说明：**
- `positions.{direction}.risk`: green=不防，yellow=慎，red=防

### 5.5 goldenTime（黄金时段）

```json
{
  "dimension": "goldenTime",
  "level": "时段参考",
  "summary": "申酉15-19时最佳，巳午09-13时最差",
  "content": "完整解读...",
  "periods": [
    { "hour": "子", "timeRange": "23-01", "element": "水", "rating": 3, "advice": "水泄金气，保守" },
    { "hour": "丑", "timeRange": "01-03", "element": "土", "rating": 4, "advice": "土生金，中等" },
    { "hour": "寅", "timeRange": "03-05", "element": "木", "rating": 2, "advice": "木被金克，低迷" },
    { "hour": "卯", "timeRange": "05-07", "element": "木", "rating": 2, "advice": "木被金克，低迷" },
    { "hour": "辰", "timeRange": "07-09", "element": "土", "rating": 4, "advice": "土生金，可出击" },
    { "hour": "巳", "timeRange": "09-11", "element": "火", "rating": 1, "advice": "火克金，最差" },
    { "hour": "午", "timeRange": "11-13", "element": "火", "rating": 1, "advice": "火克金，最差" },
    { "hour": "未", "timeRange": "13-15", "element": "土", "rating": 4, "advice": "土生金，可出击" },
    { "hour": "申", "timeRange": "15-17", "element": "金", "rating": 5, "advice": "金帮身，全力出击" },
    { "hour": "酉", "timeRange": "17-19", "element": "金", "rating": 5, "advice": "金帮身，日主本气" },
    { "hour": "戌", "timeRange": "19-21", "element": "土", "rating": 3, "advice": "土过旺则埋，谨慎" },
    { "hour": "亥", "timeRange": "21-23", "element": "水", "rating": 3, "advice": "水泄金气，保守" }
  ],
  "best3": ["申酉", "辰未", "丑"],
  "worst3": ["巳午", "寅卯"]
}
```

**字段说明：**
- `periods[].rating`: 1-5（★数量）
- `periods[].advice`: 打法建议（10字以内）

### 5.6 conflictWarning（冲突警示）

```json
{
  "dimension": "conflictWarning",
  "level": "警示参考",
  "summary": "日支辰被戌冲，有破财之象",
  "content": "完整解读...",
  "warnings": [
    { "type": "辰戌冲", "explanation": "日支辰被戌冲，财库受损", "mahjongImpact": "做大番时警惕对家碰牌" },
    { "type": "卯害", "explanation": "日支卯被害，手气受阻", "mahjongImpact": "连续摸牌不顺考虑换策略" },
    { "type": "申酉空", "explanation": "金气空亡，财运落空", "mahjongImpact": "宽叫不易，胡牌困难" }
  ],
  "alerts": [
    "不要做大番时贪碰",
    "巳午时段格外谨慎",
    "连续3次摸牌不上手考虑换桌"
  ]
}
```

**字段说明：**
- `warnings[].type`: 冲突类型
- `warnings[].explanation`: 八字原理解释
- `warnings[].mahjongImpact`: 麻将场景影响
- `alerts`: 行动警示列表

### 5.7 luckEnhancement（开运清单）

```json
{
  "dimension": "luckEnhancement",
  "level": "开运参考",
  "summary": "宜金色白色，忌红色，饮品宜绿茶",
  "content": "完整解读...",
  "drinks": {
    "suitable": [ { "name": "绿茶", "reason": "木生火克金，助运势" } ],
    "optional": [ { "name": "蜂蜜水", "reason": "甘润中合" } ],
    "avoid": [ { "name": "白酒", "reason": "火气旺盛不利金" } ]
  },
  "colors": {
    "suitable": [ { "name": "白色", "reason": "金气相助" }, { "name": "金色", "reason": "日主本气" } ],
    "accent": [ { "name": "银色", "reason": "金之余气" } ],
    "avoid": [ { "name": "红色", "reason": "火克金" } ]
  },
  "accessories": {
    "suitable": [ { "name": "金属项链", "reason": "金气补强" } ],
    "avoid": [ { "name": "皮质腰带", "reason": "土气过旺" } ]
  }
}
```

---

## 7. Prompt 设计

### 7.1 fortune prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供运势指导。

用户信息：
- 八字：[年柱] [月柱] [日柱] [时柱]
- 日主：[日主]（如庚金）
- 空亡：[空亡]
- 五行：[五行分布]
- 日支关系：[冲/破/害]

今日黄历：
- 今日：[年月日柱]
- 日主：[日干]
- 月令：[月令地支]

请按以下结构输出今日运势解读：

第一步：你的八字事实
（讲日主是什么、五行旺衰、喜忌什么）

第二步：今天的事实
（讲今天的年月日柱是什么、五行结构是什么、哪股气最旺）

第三步：叠加推导
（八字事实 + 今天事实 → 今天的核心问题是什么、哪股气是今天的救星）

结论：[旺/平/弱] + 一句话核心判断

要求：
- 全程用白话讲解，不预设用户懂八字
- 重点字眼（日主、五行喜忌、核心问题、救星）加粗或用**包围
- 麻将连接只在结论部分点一下，不在各推导段里展开
- 川麻术语（宽叫、大叫、放炮、自摸、碰、摸）可直接使用
- 语气：专业但亲切，像朋友在给你分析牌运
```

### 7.2 betting prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供运势指导。

以下是你已经确认的今日运势结论：
- 运势等级：{fortune.level}
- 核心判断：{fortune.summary}
- 今日要点：{fortune.highlights}

请基于以上结论，推导今日投注策略。

推导过程（请逐段输出）：
1. 能量水平：今天整体运势如何，有没有底气去认真打
2. 十神财运型：今天财运靠什么——偏财（运气）还是正财（技术）
3. 纳音质感：今天的能量质感是爆发型还是持续型
4. 麻将连接：运气成分、心态、资金策略

要求：
- 不要重复 fortune 的推导，要在此基础上直接给出判断
- 麻将术语（宽叫、大叫、做大番等）
- 结论简洁有力，给出明确行动指导

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "level": "大注",
  "summary": "一句话摘要",
  "reason": "一句话理由",
  "strategy": "核心策略",
  "content": "完整推导过程..."
}
```

### 7.3 bestAction prompt

```
你是一位四川麻将血战到底高手，同时精通八字命理。

用户八字：{bazi}
今日运势等级：{fortune.level}
今日要点：{fortune.highlights}

请针对以下5个场景，给出今日的麻将决策建议。

场景1：下叫（听牌）决策
今天适合宽叫还是大叫？

场景2：碰 vs 摸
什么情况下该碰牌，什么情况下该摸新牌？

场景3：放炮 vs 自摸
遇到可以胡的牌，是放炮就胡还是贪自摸？

场景4：对手方位观察
今天要重点防哪个方位的人，不怕哪个方位？

场景5：收官策略
牌局尾声，是乘胜追击还是见好就收？

要求：
- 每个场景：结论先行（10字以内），再跟推导
- 川麻术语（宽叫、大叫、放炮、自摸，碰，摸，下叫）
- 不要用"坐庄/跟牌/做牌/押注/加注"

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "summary": "一句话总述",
  "scenarios": [
    { "scene": "下叫决策", "conclusion": "宽叫优先", "reasoning": "..." },
    { "scene": "碰 vs 摸", "conclusion": "多摸少碰", "reasoning": "..." },
    { "scene": "放炮 vs 自摸", "conclusion": "优先自摸", "reasoning": "..." },
    { "scene": "对手方位", "conclusion": "防北位", "reasoning": "..." },
    { "scene": "收官策略", "conclusion": "见好就收", "reasoning": "..." }
  ],
  "content": "完整解读..."
}
```

### 7.4 direction prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供方位策略。

用户日主：{日主，如庚金}
五行喜忌：{喜什么、忌什么}
今日财神/喜神方位：{方位}

四川麻将4人座位（东南西北），用户坐在某方位时：
- 上家 = 逆时针第一家
- 下家 = 顺时针第一家
- 对家 = 正对面

座位关系（以用户坐北位为例）：
- 上家 = 东，下家 = 西，对家 = 南
（坐东位时：上家=南，下家=北，对家=西；以此类推）

请输出：
1. 各位置策略（坐在北/东/南/西位分别怎么打）
2. 上下家对家克防关系（对每个位置，指出谁要防、谁不需防）

要求：
- 用东南西北，不用"左边/右边"
- 结论清晰，让人坐在某位置时知道该怎么打

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "summary": "一句话总述",
  "positions": {
    "north": { "strategy": "坐北最佳", "caution": "防上家东位", "risk": "green" },
    "east": { "strategy": "坐东较稳", "caution": "忌贪", "risk": "green" },
    "south": { "strategy": "坐南激进", "caution": "防对家", "risk": "yellow" },
    "west": { "strategy": "坐西保守", "caution": "宜观望", "risk": "red" }
  },
  "content": "完整解读..."
}
其中 risk: green=不防，yellow=慎，red=防
```

### 7.5 goldenTime prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供时段策略。

用户日主：{日主，如庚金}
今日叠加：{今日日干 + 月令}

一天12时辰，对应五行能量：
- 寅卯（03-07）：木，木被金克
- 巳午（09-13）：火，火克金
- 辰戌丑未（07-09/19-21等）：土，土生金但过旺则埋
- 申酉（15-19）：金，金帮身
- 子亥（23-01/21-23）：水，水泄金气

请给出12时辰的能量评级和麻将打法建议。

要求：
- 打法建议简洁（10字以内）
- 今天特别需要注意的时段要标注原因

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "summary": "一句话总述",
  "periods": [
    { "hour": "子", "timeRange": "23-01", "element": "水", "rating": 3, "advice": "水泄金气，保守" },
    { "hour": "丑", "timeRange": "01-03", "element": "土", "rating": 4, "advice": "土生金，中等" },
    { "hour": "寅", "timeRange": "03-05", "element": "木", "rating": 2, "advice": "木被金克，低迷" },
    { "hour": "卯", "timeRange": "05-07", "element": "木", "rating": 2, "advice": "木被金克，低迷" },
    { "hour": "辰", "timeRange": "07-09", "element": "土", "rating": 4, "advice": "土生金，可出击" },
    { "hour": "巳", "timeRange": "09-11", "element": "火", "rating": 1, "advice": "火克金，最差" },
    { "hour": "午", "timeRange": "11-13", "element": "火", "rating": 1, "advice": "火克金，最差" },
    { "hour": "未", "timeRange": "13-15", "element": "土", "rating": 4, "advice": "土生金，可出击" },
    { "hour": "申", "timeRange": "15-17", "element": "金", "rating": 5, "advice": "金帮身，全力出击" },
    { "hour": "酉", "timeRange": "17-19", "element": "金", "rating": 5, "advice": "金帮身，日主本气" },
    { "hour": "戌", "timeRange": "19-21", "element": "土", "rating": 3, "advice": "土过旺则埋，谨慎" },
    { "hour": "亥", "timeRange": "21-23", "element": "水", "rating": 3, "advice": "水泄金气，保守" }
  ],
  "best3": ["申酉", "辰未", "丑"],
  "worst3": ["巳午", "寅卯"],
  "content": "完整解读..."
}
其中 rating: 1-5（★数量）
```

### 7.6 conflictWarning prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供风险警示。

用户日支：{日支，如辰}
今日日柱：{日柱，如庚辰}
空亡：{空亡}

今日破坏性能量：
- 日支冲：{冲的关系和结果}
- 日支破：{破的关系和结果}
- 日支害：{害的关系和结果}
- 日柱空亡：{空亡的地支}

请针对每种破坏性能量，输出：
1. 是什么（八字原理）
2. 为什么今天有这个（结合用户八字结构）
3. 对打牌的具体影响（麻将场景）

要求：
- 不要用"加大注"，用"做大番"
- 警示要具体，不是"要小心"，而是"下叫后最后几张摸牌要格外小心"

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "summary": "一句话总述",
  "warnings": [
    { "type": "辰戌冲", "explanation": "日支辰被戌冲，财库受损", "mahjongImpact": "做大番时警惕对家碰牌" }
  ],
  "alerts": ["不要做大番时贪碰", "巳午时段格外谨慎"],
  "content": "完整解读..."
}
```

### 7.7 luckEnhancement prompt

```
你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供今日开运指导。

用户八字：
- 日主：{日主，如庚金}
- 身弱/身旺：{旺衰判断}
- 五行喜忌：{喜什么、忌什么}

今日黄历：
- 今日：{年月日柱}
- 五行结构：{哪股气最旺}
- 当令之气：{今天什么气最旺}

请输出今日开运清单。

要求：
- 每类至少3个条目（宜/可选/忌）
- 解释要简洁，10-20字
- 麻将场景连接要直接（"抓牌有感觉"而不是"运气好"）
- 不纳入：数字、左右手摸牌、上厕所时机、选座位

请按以下 JSON 格式输出（只输出 JSON，不要有其他内容）：
{
  "summary": "一句话总述",
  "drinks": {
    "suitable": [ { "name": "绿茶", "reason": "木生火克金，助运势" } ],
    "optional": [ { "name": "蜂蜜水", "reason": "甘润中合" } ],
    "avoid": [ { "name": "白酒", "reason": "火气旺盛不利金" } ]
  },
  "colors": {
    "suitable": [ { "name": "白色", "reason": "金气相助" }, { "name": "金色", "reason": "日主本气" } ],
    "accent": [ { "name": "银色", "reason": "金之余气" } ],
    "avoid": [ { "name": "红色", "reason": "火克金" } ]
  },
  "accessories": {
    "suitable": [ { "name": "金属项链", "reason": "金气补强" } ],
    "avoid": [ { "name": "皮质腰带", "reason": "土气过旺" } ]
  },
  "content": "完整解读..."
}
```

---

## 8. 避坑清单（必读）

> 以下规则来自 `griffin-horoscope-lessons` skill，请开发前完整阅读。

### 8.1 MiniMax API

- **`thinking: { type: 'disabled' }` 必须显式设置**，MiniMax 默认可能开启
- 响应解析只取 `content.blocks.filter(b => !b.thinking && b.type === 'text')`
- API 域名是 `api.minimaxi.com`（不是 `api.minimaxaxi.com`）

### 8.2 前端 User 类型

前端 `User` 接口在 `AuthContext.tsx` 和 `client.ts` 两处定义。新增用户字段必须同时修改两处。

### 8.3 SQLite 迁移

任何 `DROP TABLE` / `ALTER TABLE` 之前，必须 `PRAGMA foreign_keys=OFF`，操作完成后 `PRAGMA foreign_keys=ON`。

### 8.4 第三方库 API

对不熟悉的库，不确定是 getter 还是 function 时，用 `(obj as any).prop` 探测，不要主观假设。lunisolar 的 `theGods`、`takeSound` 是 getter 属性（值），不是方法。

### 8.5 geocoding

外部 API 校验类操作必须先调用 API 成功，再执行数据库写操作。不要先写后校验。

### 8.6 ESM 模块

lunisolar 是 ESM，只能 `import()` 动态加载。所有调用方变成 async。API spec 需同步声明但实现是 async，调用方保持 `await`。

### 8.7 nginx 502

docker rebuild 后 502：`sudo rm -rf backend/dist/` 然后 `npm run build` 再重启容器。

### 8.8 Docker builder cache

缓存导致构建不一致：`docker builder prune -f` 清理后再 build。

---

## 9. 验证清单

开发完成后必须验证：

```
[ ] npx tsc --noEmit 无错误
[ ] npm run build 成功
[ ] docker compose up -d 容器运行
[ ] 登录后进入黄历 Tab，7张卡片骨架立即出现
[ ] fortune 第一个开始输出 typewriter 效果
[ ] fortune 完成后自动衔接 betting
[ ] 所有7个维度依次展示
[ ] 点击锚点导航可跳转到对应卡片
[ ] 卡片可折叠/展开
[ ] 川麻术语正确（无"坐庄/跟牌/押注"等）
[ ] goldenTime 当前时辰高亮
[ ] conflictWarning 有 alert 样式
[ ] luckEnhancement 有 ✅❌ emoji
```

---

## 10. 文件变更清单

### 后端

- `backend/src/routes/horoscope.ts`
  - 新增7个维度独立 endpoint
  - 更新 prompt 模板（7个 dimension prompt）
  - 保留 Phase 2 SSE 端点（不删除，暂不用）

- `backend/src/utils/horoscope.ts`
  - 如需要，新增 dimension-specific helper functions

### 前端

- `frontend/src/pages/HoroscopePage.tsx`（重构）
- `frontend/src/components/AnchorNav.tsx`（新增）
- `frontend/src/components/DimensionCard.tsx`（新增）
- `frontend/src/components/SkeletonCard.tsx`（新增）
- `frontend/src/components/DoneFooter.tsx`（新增）
- `frontend/src/components/dimensions/FortuneCard.tsx`（新增）
- `frontend/src/components/dimensions/BettingCard.tsx`（新增）
- `frontend/src/components/dimensions/BestActionCard.tsx`（新增）
- `frontend/src/components/dimensions/DirectionCard.tsx`（新增）
- `frontend/src/components/dimensions/GoldenTimeCard.tsx`（新增）
- `frontend/src/components/dimensions/ConflictWarningCard.tsx`（新增）
- `frontend/src/components/dimensions/LuckEnhancementCard.tsx`（新增）
- `frontend/src/hooks/useHoroscopeData.ts`（新增）
- `frontend/src/hooks/useStreamingShow.ts`（新增）

### 文档

- `docs/HOROSCOPE-PHASE3-DEV.md`（本文档）
- `docs/HOROSCOPE-DESIGN-CONTEXT.md`（设计上下文）

---

## 11. 未完成项详情（P0 → P2）

### P0（阻塞 betting/bestAction 功能）

**betting/bestAction 接入真实 fortune 数据**

- **问题**：后端 `buildBettingPrompt` 和 `buildBestActionPrompt` 用硬编码字符串拼接 fortune 数据，前端串行请求返回的 fortune 结构化字段（`level`/`summary`/`highlights`）没有传入
- **根因**：前端 `useHoroscopeData.ts` 串行请求 fortune 后，数据没有作为参数传给 betAction/bestAction API
- **修复方向**：
  1. 前端：fortune 返回后，从响应中提取 `data.level`/`data.summary`/`data.highlights`，作为参数调 betAction 和 bestAction API
  2. 后端：`buildBettingPrompt`/`buildBestActionPrompt` 接收结构化参数，用 `{fortune.level}`/`{fortune.summary}`/`{fortune.highlights}` 替换硬编码
- **影响**：betting 和 bestAction 当前内容与用户真实运势无关，是假数据

### P1（文档完善 + schema 验证）

**§5 Response Schema 补充数据库变更说明**

- 当前文档 §5 定义了 7 个维度的 JSON schema，但数据库仍存 `result_json`（整段 JSON 字符串）
- 建议在 §5 末尾补充：「数据库变更计划：拆分为 `result_data`（结构化 JSON）+ `result_content`（完整解读文本），待前端 schema 验证稳定后实施」

**§10 文件变更清单更新**

- 需要标注每个文件的完成状态（✅/⚠️/❌），当前 fc45524 的文件状态未逐项核对

**goldenTime 当前时辰高亮**

- 前端渲染 `GoldenTimeCard` 时，识别当前时辰（本地时间），高亮对应时辰卡片边框
- 需要 `frontend/src/utils/timeUtils.ts`（获取当前时辰逻辑）

**theGods plugin API 验证**

- `getTodayAlmanac` 返回的 `gods` 和 `acts` 字段为 `undefined`，需查 theGods plugin 实现

**console.log 清理**

- 多处 `console.log` 未清理，影响生产环境日志

### P2（体验优化）

**typewriter 效果**

- 当前直接显示完整内容，无 typewriter 动画
- 设计目标：fortune → betting → bestAction → ... 逐个维度 typewriter 输出
- 依赖 `useStreamingShow.ts` hook，但 streaming 模式因 MiniMax bug 被暂停

**方向维度的时辰策略展示**

- 东南西北四象的每个时辰需要展示「今日宜/忌/平」三个维度的策略，而非简单平铺

---

## 12. 接棒开发指南（fc45524）

### 当前 HEAD

```
commit fc45524
feat(horoscope): HOROSCOPE-PHASE3 7维度架构 + 串行请求
```

### 建议开发顺序

**Step 1：修复 P0 betting/bestAction 数据问题**
```
1. frontend/src/hooks/useHoroscopeData.ts
   → fortune 返回后，取 data.level/summary/highlights
   → 作为参数调 betAction 和 bestAction API
2. backend/src/routes/horoscope.ts
   → buildBettingPrompt 接收 fortuneLevel/fortuneSummary/fortuneHighlights 参数
   → buildBestActionPrompt 同上
3. 验证：betting 和 bestAction 内容与 fortune 一致
```

**Step 2：验证 P1 各项**
```
1. §5 Response Schema 写入后端 types
2. goldenTime 前端高亮当前时辰
3. theGods plugin gods/acts 字段排查
4. 全局搜索 console.log 清理
```

**Step 3：实现 P2 typewriter 效果**
```
→ 等 MiniMax streaming bug 修复后再考虑
→ 当前非 streaming 模式下 typewriter 效果价值有限
```

### 验证检查清单

- [ ] betting 内容引用了 fortune 的真实 level/summary/highlights
- [ ] bestAction 内容引用了 fortune 的真实 level/summary/highlights
- [ ] 所有 7 个维度 API 均返回符合 §5 schema 的 JSON
- [ ] goldenTime 卡片在本地时间对应时辰高亮显示
- [ ] 无 console.log 残留生产代码
- [ ] 7 个维度页面加载流畅，无骨架屏闪烁
- [ ] 川麻术语红线检查：无「加大注」字样

### 前任完成清单（fc45524）

**已完成 17 个文件修改：**
- 后端：HoroscopeRouter 添加 7 个维度路由，7 个 prompt builder，lunisolar 集成
- 前端：7 个 Card 组件，HoroscopePage/AnchorNav/DimensionCard/SkeletonCard/DoneFooter，useHoroscopeData（串行请求）
- 类型：HoroscopeResponse 类型定义
- 文档：HOROSCOPE-PHASE3-DEV.md + HOROSCOPE-DESIGN-CONTEXT.md
- Skills：重命名 griffin-horoscope-lessons / griffin-horoscope-dev

**已知遗留问题：**
1. betting/bestAction 硬编码假数据
2. goldenTime 无当前时辰高亮
3. theGods plugin gods/acts 返回 undefined
4. 多处 console.log 未清理
5. Streaming/typewriter 效果未实现
6. §5 schema 未写入后端 types
