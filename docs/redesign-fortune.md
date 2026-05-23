# 运势板块现状与重新设计需求

## 一、现状概述

### 1.1 系统定位

运势板块是 Griffin 项目的一部分，为四川麻将血战到底玩家提供基于八字和黄历的运势指导。核心功能包括：

- 每日运势分析（旺/平/弱）
- 下注策略建议
- 麻将决策建议（5个场景）
- 方位策略
- 黄金时段
- 冲煞警示
- 开运清单

### 1.2 技术架构

```
前端 (React)
    │
    ├── useHoroscopeData hook
    │   └── 顺序调用7个API
    │
    ▼
后端 API (Express)
    │
    ├── /horoscope/bazi          [GET]  返回原始八字+黄历
    ├── /horoscope/stream/:date [GET]  SSE流式叙事
    ├── /horoscope/answer       [POST] 问答
    ├── /horoscope/:date/fortune       [GET] 运势维度
    ├── /horoscope/:date/betting       [GET] 下注维度
    ├── /horoscope/:date/best-action   [GET] 最佳行动
    ├── /horoscope/:date/direction     [GET] 方位
    ├── /horoscope/:date/golden-time   [GET] 黄金时段
    ├── /horoscope/:date/conflict-warning [GET] 冲煞警示
    └── /horoscope/:date/luck-enhancement [GET] 开运清单
```

### 1.3 数据流

```
用户请求 (JWT token + targetDate)
         │
         ▼
getUserContext(userId, targetDate)
    ├── 从 users 表获取出生信息
    ├── 计算真太阳时
    ├── calculateBazi() → 八字+十神+纳音+空亡
    ├── getTodayAlmanac() → 黄历
    ├── calculateGameStats() → 战绩
    └── getLunarDate() → 农历
         │
         ▼
build*Prompt(ctx) → 组装 prompt
         │
         ▼
callMiniMax(prompt) → 调用 LLM
         │
         ▼
解析输出 → 返回 JSON
```

### 1.4 Prompt 设计（当前）

7个维度对应7个独立 prompt，各有输入输出：

| 维度 | Prompt函数 | 输入 | 输出 |
|-----|-----------|------|-----|
| 运势 | `buildFortunePrompt` | 八字+黄历+纳音 | level/summary/highlights/content |
| 下注 | `buildBettingPrompt` | 运势结论 | level/summary/content |
| 最佳行动 | `buildBestActionPrompt` | 八字+运势 | 5个场景 |
| 方位 | `buildDirectionPrompt` | 日主+月令 | 东南西北策略 |
| 黄金时段 | `buildGoldenTimePrompt` | 日主+日柱 | 12时辰评级 |
| 冲煞警示 | `buildConflictWarningPrompt` | 日支+日柱 | 警告列表 |
| 开运清单 | `buildLuckEnhancementPrompt` | 日主+纳音+黄历 | 饮品/颜色/饰品 |

---

## 二、现有问题

### 2.1 已发现的问题

1. **calculateBazi bug**：`ls.char8ex` 是函数而非对象，需调用 `ls.char8ex(gender)` 才能获取十神

2. **时柱计算错误**：真太阳时计算后可能导致时柱天干变化（如 User 1 从乙未变成戊戌），但业务逻辑未相应更新

3. **八字的理论误解**：
   - 早年/青年/晚年看"天干与日干的十神关系"
   - 中年被错误理解为"看日干五行"，正确应该是"看日支的十神"

### 2.2 可改进点

1. **Prompt 重复调用**：7个维度各自独立调用 LLM，存在信息冗余（如八字基础信息在多个 prompt 中重复）

2. **Context 共享机制缺失**：维度2、3依赖维度1的输出，但上下文共享方式不够优雅

3. **缓存机制**：
   - 已有 `horoscope_cache` 表，但具体使用情况不明
   - 八字数据本身有缓存价值（同一用户同一天不变）

4. **错误处理**：部分错误边界不清晰

---

## 三、设计目标

### 3.1 必须保留的功能

- 7个维度的运势分析
- 八字计算（需修复 bug）
- 黄历集成
- LLM 调用

### 3.2 期望改进

1. **架构优化**：更清晰的模块划分，支持扩展
2. **Prompt 优化**：减少冗余，提升输出质量稳定性
3. **缓存策略**：明确哪些数据需要/可以缓存
4. **理论正确性**：八字解读逻辑需符合正统理论
5. **可测试性**：核心逻辑可单元测试

### 3.3 技术约束

- 后端：Node.js + Express
- 数据库：SQLite
- LLM：MiniMax API
- 前端：React（暂不改动）
- 不修改：前端 API 调用接口（保持向后兼容）

---

## 四、交付要求

1. **架构设计文档**：模块划分、职责定义
2. **Prompt 优化方案**：改进后的 prompt 模板
3. **代码实现**：修复 bug + 新架构
4. **测试验证**：至少2个用户的测试用例

---

## 五、关键文件位置

| 文件 | 说明 |
|-----|------|
| `backend/src/routes/horoscope.ts` | 主路由 + prompt 构建 |
| `backend/src/utils/horoscope.ts` | 八字计算、黄历获取 |
| `backend/src/utils/lunar.ts` | 农历日期 |
| `backend/src/database.ts` | 用户表 + 缓存表 |
| `frontend/src/hooks/useHoroscopeData.ts` | 前端调用编排 |
| `docs/bazi-basics.md` | 八字概念解释 |
| `docs/prompt-templates.md` | 当前 prompt 模板 |