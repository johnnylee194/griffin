#!/usr/bin/env python3
"""
修复地点费率多个默认值问题

确保每个地点只有一个默认值（保留最早创建的）

使用方法：
  本地测试： 
    python scripts/fix-multiple-defaults.py [--dry-run]
  
  服务器（方式1 - 推荐，在宿主机执行）：
    cd ~/griffin
    docker compose down  # 先停止容器，避免数据库被锁定
    python scripts/fix-multiple-defaults.py [--dry-run]
    docker compose up -d --build  # 修复完成后重启
  
  服务器（方式2 - 在容器内执行）：
    docker compose exec app python /app/scripts/fix-multiple-defaults.py [--dry-run]
"""

import sqlite3
import sys
import os

# ============= 配置 =============

# 数据库路径：优先使用环境变量，否则自动检测
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

if 'DB_PATH' in os.environ:
    DB_PATH = os.path.expanduser(os.environ['DB_PATH'])
    DATA_DIR = os.path.dirname(DB_PATH)
else:
    # 自动检测：先检查 data/griffin.db（生产环境），再检查 backend/data/griffin.db（本地开发）
    production_db = os.path.join(PROJECT_ROOT, 'data', 'griffin.db')
    dev_db = os.path.join(PROJECT_ROOT, 'backend', 'data', 'griffin.db')
    
    if os.path.exists(production_db):
        DB_PATH = production_db
        DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
    else:
        DB_PATH = dev_db
        DATA_DIR = os.path.join(PROJECT_ROOT, 'backend', 'data')

DRY_RUN = '--dry-run' in sys.argv or '-d' in sys.argv

# ============= 主逻辑 =============

print('修复地点费率多个默认值问题')
print('=' * 50 + '\n')

# 确保数据目录存在
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)
    print(f'创建数据目录: {DATA_DIR}')

# 连接数据库
print(f'连接数据库: {DB_PATH}')
if not os.path.exists(DB_PATH):
    print('[ERROR] 数据库文件不存在！')
    print('请先从服务器下载数据库：')
    print('  scp jlee@januslab.cn:~/griffin/data/griffin.db backend/data/griffin.db')
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# ============= 检查问题 =============

print('\n[1] 检查问题...')

# 找出所有有多个默认值的地点
cursor.execute('''
    SELECT 
        lcr.location_id,
        l.name as location_name,
        COUNT(*) as default_count,
        GROUP_CONCAT(lcr.id || ':' || lcr.chip_rate || ':' || lcr.created_at, ' | ') as default_records
    FROM location_chip_rates lcr
    JOIN locations l ON lcr.location_id = l.id
    WHERE lcr.is_default = 1
    GROUP BY lcr.location_id
    HAVING COUNT(*) > 1
    ORDER BY default_count DESC
''')

problematic_locations = cursor.fetchall()

if not problematic_locations:
    print('[OK] 未发现问题：所有地点都只有一个默认值')
    conn.close()
    sys.exit(0)

print(f'[WARN] 发现 {len(problematic_locations)} 个地点存在多个默认值：\n')
for loc_id, loc_name, count, records in problematic_locations:
    print(f'  地点: {loc_name} (ID: {loc_id})')
    print(f'  默认值数量: {count}')
    print(f'  记录详情: {records}')
    print()

# ============= 统计修复信息 =============

print('[2] 统计需要修复的记录...')

# 找出所有需要取消默认的记录（除了每个地点最早的那条）
# 使用子查询找出每个地点应该保留的默认记录（按 created_at, id 排序的第一条）
cursor.execute('''
    SELECT 
        lcr.id,
        lcr.location_id,
        l.name as location_name,
        lcr.chip_rate,
        lcr.created_at
    FROM location_chip_rates lcr
    JOIN locations l ON lcr.location_id = l.id
    WHERE lcr.is_default = 1
      AND lcr.id NOT IN (
          -- 每个地点只保留最早的一条（如果时间相同，按 id 排序）
          SELECT lcr3.id
          FROM location_chip_rates lcr3
          WHERE lcr3.location_id = lcr.location_id
            AND lcr3.is_default = 1
          ORDER BY lcr3.created_at, lcr3.id
          LIMIT 1
      )
    ORDER BY l.name, lcr.created_at
''')

records_to_fix = cursor.fetchall()

print(f'[INFO] 需要修复的记录数: {len(records_to_fix)}\n')

if records_to_fix:
    print('将被取消默认的记录：')
    print('-' * 70)
    for record_id, loc_id, loc_name, chip_rate, created_at in records_to_fix:
        print(f'  地点: {loc_name} | 费率: {chip_rate} | 创建时间: {created_at} | ID: {record_id}')
    print()

# ============= 执行修复 =============

if DRY_RUN:
    print('[DRY-RUN] 预览模式：不会实际修改数据库')
    print('[DRY-RUN] 如果要执行修复，请去掉 --dry-run 参数')
else:
    print('[3] 执行修复...')
    
    # 执行修复：将所有需要取消默认的记录设为 is_default = 0
    # 对于每个地点，只保留最早的一条（按 created_at, id 排序）
    # 使用相关子查询找出应该保留的记录，然后排除它
    cursor.execute('''
        UPDATE location_chip_rates
        SET is_default = 0
        WHERE is_default = 1
          AND id != (
              -- 每个地点只保留最早的一条（如果时间相同，按 id 排序）
              SELECT lcr3.id
              FROM location_chip_rates lcr3
              WHERE lcr3.location_id = location_chip_rates.location_id
                AND lcr3.is_default = 1
              ORDER BY lcr3.created_at, lcr3.id
              LIMIT 1
          )
    ''')
    
    affected_rows = cursor.rowcount
    conn.commit()
    
    print(f'[OK] 已修复 {affected_rows} 条记录')

# ============= 验证修复结果 =============

print('\n[4] 验证修复结果...')

cursor.execute('''
    SELECT 
        location_id,
        COUNT(*) as default_count
    FROM location_chip_rates
    WHERE is_default = 1
    GROUP BY location_id
    HAVING COUNT(*) > 1
''')

remaining_problems = cursor.fetchall()

if remaining_problems:
    print('[ERROR] 修复后仍有问题：')
    for loc_id, count in remaining_problems:
        print(f'  地点 ID: {loc_id} 仍有 {count} 个默认值')
    sys.exit(1)
else:
    print('[OK] 验证通过：所有地点都只有一个默认值')

# ============= 显示修复后的统计 =============

print('\n[5] 修复后的统计信息...')

cursor.execute('''
    SELECT 
        l.name as location_name,
        lcr.chip_rate,
        lcr.created_at,
        lcr.is_default
    FROM location_chip_rates lcr
    JOIN locations l ON lcr.location_id = l.id
    WHERE lcr.is_default = 1
    ORDER BY l.name, lcr.created_at
''')

default_records = cursor.fetchall()

print(f'当前所有默认费率（共 {len(default_records)} 条）：')
print('-' * 70)
for loc_name, chip_rate, created_at, is_default in default_records:
    print(f'  地点: {loc_name} | 费率: {chip_rate} | 创建时间: {created_at}')
print()

# 关闭数据库
conn.close()

print('\n全部完成！')
