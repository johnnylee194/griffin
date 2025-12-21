#!/usr/bin/env python3
"""测试导入结果"""

import sqlite3
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 自动检测数据库路径
if 'DB_PATH' in os.environ:
    DB_PATH = os.path.expanduser(os.environ['DB_PATH'])
else:
    production_db = os.path.join(PROJECT_ROOT, 'data', 'griffin.db')
    dev_db = os.path.join(PROJECT_ROOT, 'backend', 'data', 'griffin.db')
    DB_PATH = production_db if os.path.exists(production_db) else dev_db

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print('Griffin 导入数据验证')
print('=' * 60)

# 测试1: 总记录数
print('\n[测试1] 总记录数')
print('-' * 60)
cursor.execute('SELECT COUNT(*) FROM games')
total = cursor.fetchone()[0]
print(f'总对局数: {total}')

# 测试2: 按地点统计
print('\n[测试2] 按地点统计')
print('-' * 60)
cursor.execute('''
    SELECT 
        l.name as location,
        COUNT(*) as games,
        SUM(pr.score) as total_score,
        SUM(pr.chips) as total_chips
    FROM games g
    JOIN locations l ON g.location_id = l.id
    JOIN player_records pr ON g.id = pr.game_id
    GROUP BY l.name
    ORDER BY l.name
''')
print(f'{"地点":<10} {"场次":>6} {"总分数":>10} {"总金额":>12}')
for row in cursor.fetchall():
    location, games, score, chips = row
    print(f'{location:<10} {games:>6} {score:>10} {chips:>12}')

# 测试3: 总盈亏
print('\n[测试3] 总盈亏')
print('-' * 60)
cursor.execute('SELECT SUM(pr.score), SUM(pr.chips) FROM player_records pr')
total_score, total_chips = cursor.fetchone()
print(f'总分数: {total_score}')
print(f'总金额: {total_chips}')

# 测试4: 日期范围
print('\n[测试4] 日期范围')
print('-' * 60)
cursor.execute('SELECT MIN(date(created_at)), MAX(date(created_at)) FROM games')
earliest, latest = cursor.fetchone()
print(f'最早记录: {earliest}')
print(f'最晚记录: {latest}')

# 测试5: 支出和收入统计
print('\n[测试5] 支出和收入统计')
print('-' * 60)
cursor.execute('SELECT COUNT(*) FROM player_records WHERE score < 0')
losses = cursor.fetchone()[0]
cursor.execute('SELECT COUNT(*) FROM player_records WHERE score > 0')
wins = cursor.fetchone()[0]
cursor.execute('SELECT SUM(chips) FROM player_records WHERE score < 0')
loss_chips = cursor.fetchone()[0]
cursor.execute('SELECT SUM(chips) FROM player_records WHERE score > 0')
win_chips = cursor.fetchone()[0]
print(f'支出记录: {losses} 条, 总计: {loss_chips} 元')
print(f'收入记录: {wins} 条, 总计: {win_chips} 元')

# 测试6: 按筹码比率统计
print('\n[测试6] 按筹码比率统计')
print('-' * 60)
cursor.execute('''
    SELECT 
        chip_rate,
        COUNT(*) as games,
        SUM(pr.chips) as total_chips
    FROM games g
    JOIN player_records pr ON g.id = pr.game_id
    GROUP BY chip_rate
    ORDER BY chip_rate
''')
print(f'{"筹码比率":>8} {"场次":>6} {"总金额":>12}')
for row in cursor.fetchall():
    rate, games, chips = row
    print(f'{rate:>8} {games:>6} {chips:>12}')

# 测试7: 最近三个月统计
print('\n[测试7] 最近三个月统计')
print('-' * 60)
cursor.execute('''
    SELECT 
        COALESCE(SUM(CASE WHEN chips > 0 THEN chips ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN chips < 0 THEN chips ELSE 0 END), 0) as expense,
        COALESCE(SUM(chips), 0) as profit
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE g.created_at >= date('now', '-3 months')
''')
income, expense, profit = cursor.fetchone()
print(f'总收入: {income:,} 元')
print(f'总支出: {expense:,} 元')
print(f'利润: {profit:,} 元')

# 测试8: 去年和今年统计
print('\n[测试8] 去年和今年统计')
print('-' * 60)

# 今年
cursor.execute('''
    SELECT 
        COALESCE(SUM(CASE WHEN chips > 0 THEN chips ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN chips < 0 THEN chips ELSE 0 END), 0) as expense,
        COALESCE(SUM(chips), 0) as profit
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE strftime('%Y', g.created_at) = strftime('%Y', 'now')
''')
income_2025, expense_2025, profit_2025 = cursor.fetchone()
print(f'今年 (2025):')
print(f'  总收入: {income_2025:,} 元')
print(f'  总支出: {expense_2025:,} 元')
print(f'  利润: {profit_2025:,} 元')

# 去年
cursor.execute('''
    SELECT 
        COALESCE(SUM(CASE WHEN chips > 0 THEN chips ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN chips < 0 THEN chips ELSE 0 END), 0) as expense,
        COALESCE(SUM(chips), 0) as profit
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    WHERE strftime('%Y', g.created_at) = strftime('%Y', 'now', '-1 year')
''')
income_2024, expense_2024, profit_2024 = cursor.fetchone()
print(f'去年 (2024):')
print(f'  总收入: {income_2024:,} 元')
print(f'  总支出: {expense_2024:,} 元')
print(f'  利润: {profit_2024:,} 元')

# 测试9: 最近10条记录
print('\n[测试9] 最近10条记录')
print('-' * 60)
cursor.execute('''
    SELECT 
        date(g.created_at) as date,
        l.name as location,
        g.chip_rate,
        pr.score,
        pr.chips
    FROM games g
    JOIN locations l ON g.location_id = l.id
    JOIN player_records pr ON g.id = pr.game_id
    ORDER BY g.created_at DESC
    LIMIT 10
''')
print(f'{"日期":<12} {"地点":<8} {"比率":>4} {"分数":>6} {"金额":>10}')
for row in cursor.fetchall():
    date, location, rate, score, chips = row
    print(f'{date:<12} {location:<8} {rate:>4} {score:>6} {chips:>10}')

print('\n' + '=' * 60)
print('验证完成！')

conn.close()

