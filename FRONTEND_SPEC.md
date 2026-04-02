# 白漂 BayPier — 前端设计规格文档

> 给前端设计师/开发者的完整参考文档。包含页面结构、状态机、数据接口、设计规范。

---

## 零、产品现状概览

白漂项目目前有两个前端形态：

| 形态 | 仓库 | 状态 | 说明 |
|------|------|------|------|
| **微信小程序**（主力） | `baipiao-hongwen` | 开发中，可真机预览 | 原生小程序，含 BFF 服务端 |
| H5 官网（展示用） | `BayPier-frontend` | 已上线 | 纯静态页面，GitHub Pages 部署 |

**生产环境：**
- BFF API: `https://api.qungan.com`（腾讯云广州 42.194.216.190）
- 数据库: Supabase（政策库 225 条，13 城市）+ SQLite（用户/auth 本地存储）
- LLM: MiniMax-M2.7 via Yunwu API
- 微信 AppID: `wx081d3689a29439c3`

---

## 一、产品概述

**白漂 BayPier** 是一个面向应届生和青年人才的城市补贴政策查询平台。用户选择城市后，浏览该城市所有可申请的人才补贴政策，查看详细的申报条件和流程。

**H5 线上地址**: https://amberify-me.github.io/BayPier-frontend/

---

## 二、页面结构（共 4 页）

| 页面 | 文件 | URL | 说明 |
|------|------|-----|------|
| 首页 | `index.html` | `/` | 用户填写信息表单，选择城市，开始匹配 |
| 政策列表 | `match.html` | `/match.html?city=厦门市&regionId=xxx` | 按城市展示所有 active 政策 |
| 政策详情 | `policy.html` | `/policy.html?id=xxx` | 单条政策的完整信息 |
| 个人中心 | `resume.html` | `/resume.html` | 简历管理（当前为静态 mockup） |

---

## 三、页面状态机

### 3.1 首页 (`index.html`)

```
┌──────────┐
│   IDLE   │  表单空白，城市默认厦门
└────┬─────┘
     │ 用户填写表单 / 上传简历
     ▼
┌──────────┐
│  FILLED  │  表单已填写（所有字段可选，可跳过）
└────┬─────┘
     │ 点击「寻找政策机会」
     ▼
┌──────────┐
│ REDIRECT │  → match.html?city=xxx&regionId=xxx
└──────────┘
```

**表单字段**（均为可选）:
| 字段 | 类型 | 选项 |
|------|------|------|
| 性别 | select | 男 / 女 / 其他 |
| 生日 | date | - |
| 意向城市 | select | 13 个城市（见下方城市列表） |
| 学历 | select | 本科 / 硕士 / 博士 / 大专及其他 |
| 就读学校 | text | 学校全称 |
| 专业 | text | 所属学科门类 |
| 其他重要履历 | textarea | 自由文本 |

**简历上传**: 支持 PDF/DOCX，最大 10MB。当前仅前端占位，未接后端解析。

---

### 3.2 政策列表 (`match.html`)

```
┌──────────┐
│ LOADING  │  显示「加载中...」
└────┬─────┘
     │ API 返回
     ├─── 有数据 ──▶ ┌──────────┐
     │               │ LOADED   │  渲染政策卡片列表
     │               └────┬─────┘
     │                    │ 切换城市
     │                    ▼
     │               ┌──────────┐
     │               │ RELOAD   │  → match.html?city=新城市&regionId=xxx
     │               └──────────┘
     │
     ├─── 无数据 ──▶ ┌──────────┐
     │               │  EMPTY   │  显示「暂无有效政策数据」
     │               └──────────┘
     │
     └─── 报错 ───▶ ┌──────────┐
                    │  ERROR   │  显示错误信息 + 重试提示
                    └──────────┘
```

**URL 参数**:
- `city` (string): 城市名，如 `厦门市`
- `regionId` (UUID): 城市的 region UUID

**城市选择器**: 顶部下拉框，切换后整页跳转（带新的 query params）。

---

### 3.3 政策详情 (`policy.html`)

```
┌──────────┐
│ LOADING  │  标题显示「加载中...」
└────┬─────┘
     │ API 返回
     ├─── 有数据 ──▶ ┌──────────┐
     │               │ LOADED   │  渲染完整政策信息
     │               └──────────┘
     │
     ├─── 无数据 ──▶ ┌──────────┐
     │               │ NOT_FOUND│  标题显示「政策不存在」
     │               └──────────┘
     │
     ├─── 无 ID ──▶  ┌──────────┐
     │               │ NO_ID    │  标题显示「缺少政策 ID」
     │               └──────────┘
     │
     └─── 报错 ───▶ ┌──────────┐
                    │  ERROR   │  标题「加载失败」+ 错误详情
                    └──────────┘
```

**URL 参数**: `id` (UUID): 政策 ID

**页面布局** (桌面端左 8 右 4 两栏):

左栏（主内容）:
1. **补贴金额** — 高亮卡片，含「查看官方页面」外链按钮
2. **申报条件** — 结构化规则列表（必选/可选标记）
3. **申报路径** — 步骤时间线（从 application_method 拆分）
4. **详细说明** — 仅当 content 字段有值时显示

右栏（侧边栏）:
1. **政策摘要** — 一段话描述
2. **基本信息** — 地区/类型/状态/时限/置信度
3. **标签** — 仅当有标签时显示
4. **返回政策列表** — 链接卡片

---

### 3.4 个人中心 (`resume.html`)

当前为**静态 mockup 页面**，数据写死。主要展示设计意图：
- 简历文件卡片（上传/重新上传/下载）
- 解析准确度指示器
- 个人信息卡片
- 教育经历时间线
- 工作经历列表

---

## 四、导航结构

### 桌面端 — 顶部导航栏
固定在页面顶部，毛玻璃效果。

```
[bubble_chart] 白漂 BayPier          首页   政策库   个人中心
```

- Logo 可点击，链接到 `index.html`
- 当前页面高亮（`text-sky-700 font-bold`），其他为 `text-slate-500`

### 移动端 — 底部导航栏
`md:hidden`，固定在底部，圆角顶部。

```
    [home]        [description]      [person]
     首页            政策库              我的
```

- 当前页面高亮（`bg-sky-100 text-sky-700`），其他为 `text-slate-400`

---

## 五、数据接口（Supabase REST API）

### 5.1 连接信息

```
SUPABASE_URL = https://xcvbeyntfgjfyifyicha.supabase.co
SUPABASE_ANON_KEY = sb_publishable_DZIaADi3MLC5yPKv8bLKag_CFUGSSyw
```

所有请求需带 Headers:
```
apikey: {ANON_KEY}
Authorization: Bearer {ANON_KEY}
```

### 5.2 获取政策列表

```
GET /rest/v1/policies
  ?select=*,regions(name,full_path)
  &region_id=eq.{regionId}
  &status=eq.active
  &order=subsidy_amount_max.desc
```

### 5.3 获取单条政策详情

```
GET /rest/v1/policies
  ?select=*,regions(name,full_path),policy_eligibility_rules(rule_field,operator,value,is_required),policy_tags(tag)
  &id=eq.{policyId}
```

### 5.4 政策数据模型

```typescript
interface Policy {
  id: string                    // UUID
  title: string                 // 政策名称
  summary: string | null        // AI 生成的一句话摘要
  content: string | null        // 详细政策文本（可能很长或为空）
  type: PolicyType              // 政策类型枚举
  status: 'active' | 'expired' | 'unverified'

  // 金额
  subsidy_amount_desc: string | null   // 文字描述，如 "本科1万/硕士3万"
  subsidy_amount_max: number | null    // 最高金额（元）
  subsidy_amount_min: number | null    // 最低金额（元）

  // 申请信息
  eligibility_summary: string | null   // 申请条件摘要
  application_method: string | null    // 申报流程文本（句号分隔的步骤）
  official_url: string | null          // 官方政策页面链接
  time_limit_desc: string | null       // 时限描述，如 "毕业两年内申请"

  // 可信度
  verified: boolean                    // 是否经过人工核验
  confidence_score: number | null      // AI 置信度 0.0-1.0

  // 关联数据
  region_id: string                    // 关联的城市 UUID
  regions: { name: string, full_path: string }  // join
  policy_eligibility_rules: EligibilityRule[]    // join
  policy_tags: { tag: string }[]                 // join
}

interface EligibilityRule {
  rule_field: string      // 规则字段（见下方映射表）
  operator: string        // eq | in | gte | lte | between
  value: any              // 值（字符串、数组或 JSON）
  is_required: boolean    // 是否为必要条件
}
```

### 5.5 枚举值映射

**政策类型 `PolicyType`**:

| 值 | 中文 | 当前数量 |
|----|------|----------|
| `living_subsidy` | 生活补贴 | 38 |
| `rental_subsidy` | 租房补贴 | 34 |
| `employment_subsidy` | 就业补贴 | 31 |
| `entrepreneurship` | 创业扶持 | 31 |
| `talent_introduction` | 人才引进 | 29 |
| `housing_subsidy` | 购房补贴 | 20 |
| `social_insurance` | 社保补贴 | 14 |
| `skill_training` | 技能培训 | 12 |
| `settling_allowance` | 安家补贴 | 12 |
| `other` | 其他 | 3 |
| `public_rental` | 公租房 | 1 |

**规则字段 `rule_field`**:

| 值 | 中文 |
|----|------|
| `degree` | 学历要求 |
| `graduation_year` | 毕业年份 |
| `school_tier` | 院校层次 |
| `employment_status` | 就业状态 |
| `has_social_insurance` | 社保要求 |
| `hukou_type` | 户口类型 |

**核验状态徽章**:

| 条件 | 样式 | 文字 |
|------|------|------|
| `verified === true` | 绿色 `bg-green-100 text-green-700` | 已核验 |
| `confidence_score >= 0.7` | 蓝色 `bg-blue-100 text-blue-700` | 高置信 |
| 其他 | 黄色 `bg-amber-100 text-amber-700` | 待核验 |

---

## 六、城市列表（13 个）

| 城市 | region UUID | 当前政策数 |
|------|------------|-----------|
| 厦门市 | `b0000000-0000-0000-0000-000000000011` | 17 |
| 杭州市 | `b0000000-0000-0000-0000-000000000001` | 10 |
| 深圳市 | `b0000000-0000-0000-0000-000000000003` | 30 |
| 上海市 | `a0000000-0000-0000-0000-000000000006` | 21 |
| 北京市 | `a0000000-0000-0000-0000-000000000007` | 10 |
| 南京市 | `b0000000-0000-0000-0000-000000000006` | 15 |
| 成都市 | `b0000000-0000-0000-0000-000000000005` | 6 |
| 武汉市 | `b0000000-0000-0000-0000-000000000008` | 20 |
| 长沙市 | `b0000000-0000-0000-0000-000000000009` | 11 |
| 广州市 | `b0000000-0000-0000-0000-000000000004` | 15 |
| 宁波市 | `b0000000-0000-0000-0000-000000000002` | 25 |
| 苏州市 | `b0000000-0000-0000-0000-000000000007` | 14 |
| 重庆市 | `b0000000-0000-0000-0000-000000000010` | 16 |

默认城市：**厦门市**（列表第一个）

> 注：数据库中还有少量政策挂在省级（四川省 9 条、湖北省 5 条、福建省 1 条），目前前端按城市查询不会显示这些。

---

## 七、城市选择 & 状态持久化

- 城市选择存储在 `sessionStorage`，key 为 `bp_city`，值为 `{ id, name }`
- URL 参数 `regionId` + `city` 优先级高于 sessionStorage
- 无任何存储时 fallback 到默认城市（厦门）
- 切换城市 = 整页跳转（不是 SPA 局部刷新）

---

## 八、金额显示逻辑

优先级：
1. `subsidy_amount_desc`（文字描述，如 "本科1万/硕士3万/博士5万"）
2. `subsidy_amount_max > 0` → 显示 "最高 XX,XXX 元"
3. 兜底 → "详见官方说明"

---

## 九、设计规范

### 9.1 色彩系统（Material Design 3）

核心色：
- **Primary**: `#005f9c`（深蓝） / Container: `#0079c4` / Fixed: `#d0e4ff`
- **On-Surface**: `#191c1d` / Variant: `#3f4752`
- **Surface**: `#f8f9fa`（页面底色）/ Lowest: `#ffffff`（卡片）/ High: `#e7e8e9`
- **Error**: `#ba1a1a`

### 9.2 字体

| 用途 | 字体 | 字重 |
|------|------|------|
| 标题/数字 | Manrope | 400, 600, 700, 800 |
| 正文/标签 | Plus Jakarta Sans | 400, 500, 600, 700 |

### 9.3 圆角

- 卡片: `rounded-xl`（0.75rem）
- 按钮/标签: `rounded-full`（9999px）
- 输入框: `rounded-xl`

### 9.4 阴影

- 卡片: `shadow-[0_4px_20px_rgba(0,95,156,0.06)]`
- 卡片 hover: `shadow-[0_8px_30px_rgba(0,95,156,0.12)]`
- 顶部导航: `shadow-[0_20px_40px_rgba(0,95,156,0.06)]` + `backdrop-blur`

### 9.5 图标

使用 Google Material Symbols Outlined：
- `bubble_chart` — Logo
- `home` / `description` / `person` — 底部导航
- `search` — 搜索按钮
- `upload_file` — 简历上传
- `verified_user` / `check_circle` — 条件核验
- `route` — 申报路径
- `location_on` / `category` / `schedule` — 详情页标签
- `open_in_new` — 外链
- `search_off` — 空状态

---

## 十、真实数据示例

### 政策卡片（列表页）

```json
{
  "title": "杭州租房补贴",
  "type": "rental_subsidy",           // → 显示「租房补贴」标签
  "verified": false,
  "confidence_score": 0.95,           // ≥0.7 → 显示「高置信」蓝标
  "eligibility_summary": "全日制本科及以上学历，毕业一年内参保，连续缴纳6个月社保",
  "subsidy_amount_desc": "5000元/半年，可享3年，共3万元",
  "subsidy_amount_max": 30000,
  "time_limit_desc": "毕业两年内申请"
}
```

### 政策详情（详情页 join 数据）

```json
{
  "title": "杭州租房补贴",
  "type": "rental_subsidy",
  "summary": "毕业一年内参保，5000元/半年，可享3年，共3万元",
  "subsidy_amount_desc": "5000元/半年，可享3年，共3万元",
  "official_url": "https://zwfw.fgj.hangzhou.gov.cn/hzzl/webrent/tzinfo_747743518.htm",
  "application_method": "登录浙里办APP搜索「大学生租房补贴」。填写个人信息并提交申请。审核通过后补贴发放至银行账户",
  "regions": { "name": "杭州市" },
  "policy_eligibility_rules": [
    { "rule_field": "degree", "operator": "gte", "value": "\"本科\"", "is_required": true },
    { "rule_field": "graduation_year", "operator": "lte", "value": "\"1年\"", "is_required": true },
    { "rule_field": "has_social_insurance", "operator": "eq", "value": "\"连续6个月\"", "is_required": true }
  ],
  "policy_tags": [
    { "tag": "租房补贴" },
    { "tag": "杭州" },
    { "tag": "毕业生" }
  ]
}
```

---

## 十一、当前已知问题 & 改进空间

1. **个人中心页**是纯静态 mockup，没有接真实数据
2. **首页表单数据**提交后没有传递到后端或用于智能匹配，目前只取了城市字段做跳转
3. **简历上传**仅前端占位，未接后端解析 API
4. **省级政策**（四川省 9 条、湖北省 5 条）前端按城市查询不到，需要决定是否在成都/武汉下展示
5. **政策列表**没有分页/筛选/搜索功能，目前是全量加载
6. **移动端适配**基本可用，但列表页城市选择器交互可优化
7. **application_method 拆分**靠句号分割，部分数据步骤拆得不够准确

---

## 十二、技术栈

- 纯静态 HTML/JS，无构建步骤
- Tailwind CSS（CDN 引入）
- Material Symbols（CDN 引入）
- Supabase REST API（直接 fetch）
- 部署在 GitHub Pages（`/docs` 目录）
