# Griffin 数据导入脚本

## 📋 说明

`import-mymoney.py` 是一个一次性脚本，用于将 `myMoney.xls` 历史数据导入到 Griffin 数据库。

导入完成后，此脚本和 Excel 文件可以删除。

---

## 🚀 使用方法

### 方法 1：本地测试（推荐先测试）

1. **安装依赖**：
   ```bash
   pip install -r scripts/requirements.txt
   ```

2. **准备文件**：
   ```bash
   # 确保 myMoney.xls 在项目根目录
   ls myMoney.xls
   ```

3. **运行脚本**：
   ```bash
   python scripts/import-mymoney.py myMoney.xls
   ```

4. **查看结果**：
   ```bash
   # 检查本地数据库
   sqlite3 backend/data/griffin.db "SELECT COUNT(*) FROM games;"
   ```

---

### 方法 2：服务器导入（正式导入）

1. **上传文件到服务器**：
   ```bash
   scp myMoney.xls your-user@example.com:~/griffin/
   ```

2. **SSH 连接服务器**：
   ```bash
   ssh your-user@example.com
   cd ~/griffin
   ```

3. **运行导入脚本**：
   ```bash
   # 在容器内运行
   docker compose exec app python /app/scripts/import-mymoney.py /app/myMoney.xls
   ```

4. **验证导入结果**：
   ```bash
   # 查看导入的记录数
   sqlite3 ~/griffin/data/griffin.db "SELECT COUNT(*) FROM games;"
   
   # 查看最近的记录
   sqlite3 ~/griffin/data/griffin.db "
   SELECT 
     g.created_at, 
     l.name as location, 
     pr.score, 
     pr.chips 
   FROM games g
   JOIN locations l ON g.location_id = l.id
   JOIN player_records pr ON g.id = pr.game_id
   ORDER BY g.created_at DESC
   LIMIT 10;
   "
   ```

5. **清理文件**（可选）：
   ```bash
   rm ~/griffin/myMoney.xls
   rm ~/griffin/scripts/import-mymoney.py
   rm ~/griffin/scripts/requirements.txt
   ```

---

## 📊 导入规则

### 地点和筹码比率映射

| 商家 | 子分类 | 地点 | 筹码比率 |
|------|--------|------|----------|
| 紫竹郡 | - | 紫竹郡 | 100 |
| 李娥 | - | 李娥 | 200 |
| (空) | 线下/茶楼 | 花漾涧 | 200 |
| (空) | 网麻/线上 | 网麻 | 10 |
| (空) | 地主/斗地主 | 斗地主 | 10 |
| (空) | 德州 | 德州 | 100 |

### 数据转换

- **支出 sheet**: 金额 → 负分（例如：100元 → -100分 → -10000筹码，chipRate=100）
- **收入 sheet**: 金额 → 正分（例如：100元 → +100分 → +10000筹码，chipRate=100）

### 重复检测

脚本会自动跳过重复记录（同一天、同金额、同地点）。

---

## 🔍 输出说明

脚本运行后会显示：

```
✅ 成功导入: 1234 条记录
⏭️  跳过重复: 56 条
⚠️  无法匹配: 12 条
❌ 错误: 0 条
```

### 无法匹配的记录

如果有记录无法匹配规则，脚本会列出详情：

```
⚠️  无法匹配的记录（需要手动处理）:
   支出 | 行123 | 2024-01-15 | 商家: 某地点 | 子分类: 某类型 | 金额: 100
```

这些记录需要：
1. 检查是否需要添加新的映射规则
2. 或手动在 Griffin 中添加

---

## ⚠️ 注意事项

1. **先本地测试**，确保没问题再在服务器运行
2. **备份数据库**（如果服务器已有重要数据）
3. **脚本是一次性的**，导入完成后可以删除
4. **检查无法匹配的记录**，确保没有遗漏重要数据

---

## 🗑️ 清理

导入完成后，可以删除：

```bash
# 本地
rm myMoney.xls
git rm scripts/import-mymoney.ts scripts/README.md

# 服务器
ssh your-user@example.com "rm ~/griffin/myMoney.xls"
```

