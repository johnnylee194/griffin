#!/usr/bin/env python3
"""
一次性导入脚本：将 myMoney.xls 历史数据导入 Griffin 数据库

使用方法：
  本地测试： python scripts/import-mymoney.py myMoney.xls
  服务器： docker compose exec app python /app/scripts/import-mymoney.py /app/myMoney.xls
"""

import sqlite3
import pandas as pd
import sys
import os
from datetime import datetime
import secrets

# ============= 配置 =============

# 脚本在 scripts/ 目录，数据库在 backend/data/griffin.db
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_ROOT, 'backend', 'data', 'griffin.db')
DATA_DIR = os.path.join(PROJECT_ROOT, 'backend', 'data')

if len(sys.argv) < 2:
    print('[ERROR] 请提供 Excel 文件路径')
    print('用法: python scripts/import-mymoney.py <excel文件路径> [--yes]')
    sys.exit(1)

EXCEL_PATH = sys.argv[1]
AUTO_CONFIRM = '--yes' in sys.argv or '-y' in sys.argv

# ============= 工具函数 =============

def generate_id():
    """生成类似 CUID 的 ID"""
    return 'c' + secrets.token_urlsafe(12)

def get_location_mapping(merchant, sub_category):
    """
    根据商家和子分类返回地点和筹码比率
    返回: (location_name, chip_rate) 或 None
    """
    # 规则 1.1: 商家 = 紫竹郡
    if merchant == '紫竹郡':
        return ('紫竹郡', 100)
    
    # 规则 1.1: 商家 = 李娥
    if merchant == '李娥':
        return ('李娥', 200)
    
    # 规则 1.2-1.5: 商家为空
    if pd.isna(merchant) or str(merchant).strip() == '':
        if sub_category in ['线下', '茶楼']:
            return ('花漾涧', 200)
        if sub_category in ['网麻', '线上']:
            return ('网麻', 10)
        if sub_category in ['地主', '斗地主']:
            return ('斗地主', 10)
        if sub_category == '德州':
            return ('德州', 100)
    
    # 无法匹配
    return None

def ensure_location(conn, location_name):
    """确保地点存在，返回地点ID"""
    cursor = conn.cursor()
    
    # 查找地点
    cursor.execute('SELECT id FROM locations WHERE name = ?', (location_name,))
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # 创建新地点
    location_id = generate_id()
    cursor.execute('''
        INSERT INTO locations (id, name, is_default, created_at)
        VALUES (?, ?, 0, datetime('now'))
    ''', (location_id, location_name))
    
    print(f'  [NEW] 创建新地点: {location_name}')
    return location_id

def is_duplicate(conn, date, score, location_id):
    """检查是否重复记录（同一天、同分数、同地点）"""
    cursor = conn.cursor()
    date_str = date.strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT COUNT(*) 
        FROM games g
        JOIN player_records pr ON g.id = pr.game_id
        WHERE DATE(g.created_at) = ? 
          AND pr.score = ? 
          AND g.location_id = ?
    ''', (date_str, score, location_id))
    
    return cursor.fetchone()[0] > 0

# ============= 主逻辑 =============

print('Griffin 数据导入脚本')
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

# 清空历史数据（保留用户、玩家、地点）
print('\n[WARN] 清空现有对局数据...')
cursor.execute('SELECT COUNT(*) FROM games')
old_games_count = cursor.fetchone()[0]
cursor.execute('SELECT COUNT(*) FROM player_records')
old_records_count = cursor.fetchone()[0]

if old_games_count > 0 or old_records_count > 0:
    if not AUTO_CONFIRM:
        response = input(f'数据库中有 {old_games_count} 场对局和 {old_records_count} 条记录，确定清空吗？(yes/no): ')
        if response.lower() != 'yes':
            print('[ABORT] 用户取消操作')
            sys.exit(0)
    else:
        print(f'[AUTO] 自动确认清空 {old_games_count} 场对局和 {old_records_count} 条记录')
    
    cursor.execute('DELETE FROM player_records')
    cursor.execute('DELETE FROM games')
    conn.commit()
    print(f'[OK] 已清空 {old_games_count} 场对局和 {old_records_count} 条记录\n')
else:
    print('[OK] 数据库为空，无需清空\n')

# 获取"我"的玩家ID
cursor.execute('SELECT id FROM players WHERE is_me = 1')
my_player = cursor.fetchone()

if not my_player:
    print('[ERROR] 找不到"我"这个玩家，请确保数据库已正确初始化')
    sys.exit(1)

my_player_id = my_player[0]

print(f'[OK] 玩家ID: {my_player_id}\n')

# 读取 Excel
print(f'读取 Excel: {EXCEL_PATH}')
try:
    excel_file = pd.ExcelFile(EXCEL_PATH)
except Exception as e:
    print(f'[ERROR] 无法读取 Excel 文件: {e}')
    sys.exit(1)

if '支出' not in excel_file.sheet_names or '收入' not in excel_file.sheet_names:
    print('[ERROR] Excel 文件必须包含"支出"和"收入"两个 sheet')
    sys.exit(1)

# 统计信息
stats = {
    'imported': 0,
    'duplicates': 0,
    'unmatched': [],
    'errors': []
}

# 处理每个 sheet
for sheet_name in ['支出', '收入']:
    print(f'\n处理 {sheet_name} sheet...')
    
    df = pd.read_excel(EXCEL_PATH, sheet_name=sheet_name)
    print(f'   共 {len(df)} 条记录')
    
    sheet_imported = 0
    sheet_duplicates = 0
    sheet_unmatched = 0
    
    for index, row in df.iterrows():
        try:
            # 读取字段
            date = row.get('日期')
            merchant = row.get('商家')
            sub_category = row.get('子分类')
            amount = float(row.get('金额', 0))
            
            # 跳过无效行
            if pd.isna(date) or amount == 0:
                continue
            
            # 解析日期
            if isinstance(date, str):
                # 尝试多种日期格式
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d', '%Y/%m/%d']:
                    try:
                        parsed_date = datetime.strptime(date, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError(f'无法解析日期格式: {date}')
            else:
                # pandas 已经解析为 datetime
                parsed_date = pd.to_datetime(date)
            
            # 获取地点和筹码比率
            location_mapping = get_location_mapping(merchant, sub_category)
            
            if not location_mapping:
                stats['unmatched'].append({
                    'sheet': sheet_name,
                    'row': index + 2,
                    'date': parsed_date.strftime('%Y-%m-%d'),
                    'merchant': str(merchant) if not pd.isna(merchant) else '(空)',
                    'sub_category': str(sub_category) if not pd.isna(sub_category) else '(空)',
                    'amount': amount
                })
                sheet_unmatched += 1
                continue
            
            location_name, chip_rate = location_mapping
            location_id = ensure_location(conn, location_name)
            
            # Excel 的金额字段就是实际筹码金额
            # 计算：分数 = 筹码 / 比率
            chips = int(-amount if sheet_name == '支出' else amount)
            score = int(chips / chip_rate)
            
            # 检查重复
            if is_duplicate(conn, parsed_date, score, location_id):
                stats['duplicates'] += 1
                sheet_duplicates += 1
                continue
            
            # 创建对局
            game_id = generate_id()
            timestamp = parsed_date.isoformat()
            
            cursor.execute('''
                INSERT INTO games (id, location_id, chip_rate, is_complete, is_balanced, note, created_at, updated_at)
                VALUES (?, ?, ?, 0, NULL, NULL, ?, ?)
            ''', (game_id, location_id, chip_rate, timestamp, timestamp))
            
            # 创建玩家记录
            record_id = generate_id()
            cursor.execute('''
                INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (record_id, game_id, my_player_id, int(score), chips, timestamp))
            
            stats['imported'] += 1
            sheet_imported += 1
            
        except Exception as e:
            stats['errors'].append({
                'sheet': sheet_name,
                'row': index + 2,
                'error': str(e)
            })
    
    print(f'   [OK] 导入: {sheet_imported} 条')
    print(f'   [SKIP] 跳过重复: {sheet_duplicates} 条')
    print(f'   [WARN] 无法匹配: {sheet_unmatched} 条')

# 提交事务
conn.commit()

# ============= 输出结果 =============

print('\n' + '=' * 50)
print('导入完成！\n')
print(f'[OK] 成功导入: {stats["imported"]} 条记录')
print(f'[SKIP] 跳过重复: {stats["duplicates"]} 条')
print(f'[WARN] 无法匹配: {len(stats["unmatched"])} 条')
print(f'[ERROR] 错误: {len(stats["errors"])} 条\n')

# 显示无法匹配的记录
if stats['unmatched']:
    print('[WARN] 无法匹配的记录（需要手动处理）:')
    print('-' * 50)
    for item in stats['unmatched'][:20]:  # 最多显示 20 条
        print(f'   {item["sheet"]} | 行{item["row"]} | {item["date"]} | 商家: {item["merchant"]} | 子分类: {item["sub_category"]} | 金额: {item["amount"]}')
    if len(stats['unmatched']) > 20:
        print(f'   ... 还有 {len(stats["unmatched"]) - 20} 条未显示')
    print('')

# 显示错误
if stats['errors']:
    print('[ERROR] 错误记录:')
    print('-' * 50)
    for item in stats['errors'][:20]:  # 最多显示 20 条
        print(f'   {item["sheet"]} | 行{item["row"]} | 错误: {item["error"]}')
    if len(stats['errors']) > 20:
        print(f'   ... 还有 {len(stats["errors"]) - 20} 条未显示')
    print('')

# 关闭数据库
conn.close()

print('\n全部完成！')

