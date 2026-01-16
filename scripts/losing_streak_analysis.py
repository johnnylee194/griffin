#!/usr/bin/env python3
"""
连输统计脚本
功能：
1. 按天为单位统计当日输赢
2. 连续输则金额累加
3. 赢了则金额清零
4. 统计连输期间：x月x号 - x月x号，共x天，共输xx
5. 导出为markdown文件
6. 分析：最少金额，最多金额，多少金额能覆盖大部分情况
"""

import sqlite3
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import statistics
import json

def connect_db(db_path: str) -> sqlite3.Connection:
    """连接数据库"""
    return sqlite3.connect(db_path)

def get_my_player_ids(conn: sqlite3.Connection) -> List[str]:
    """获取'我'的玩家ID列表"""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM players WHERE name = '我' OR is_me = 1")
    return [row[0] for row in cursor.fetchall()]

def get_daily_stats(conn: sqlite3.Connection, player_ids: List[str], location_name: Optional[str] = None) -> List[Dict]:
    """
    获取按天统计的输赢数据
    返回：[{date: '2024-01-01', total_chips: 100, is_win: True}, ...]
    """
    cursor = conn.cursor()
    
    # 构建查询
    query = """
    SELECT 
        DATE(g.created_at) as game_date,
        SUM(pr.chips) as daily_total,
        COUNT(*) as game_count
    FROM player_records pr
    JOIN games g ON pr.game_id = g.id
    JOIN players p ON pr.player_id = p.id
    WHERE p.id IN ({})
    """.format(','.join(['?'] * len(player_ids)))
    
    params = player_ids
    
    if location_name:
        query += " AND g.location_id IN (SELECT id FROM locations WHERE name = ?)"
        params = params + [location_name]
    
    query += """
    GROUP BY DATE(g.created_at)
    ORDER BY game_date ASC
    """
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    daily_stats = []
    for date_str, daily_total, game_count in results:
        if daily_total is None:
            continue
            
        daily_stats.append({
            'date': date_str,
            'total_chips': daily_total,
            'game_count': game_count,
            'is_win': daily_total > 0,
            'loss_amount': abs(daily_total) if daily_total < 0 else 0
        })
    
    return daily_stats

def analyze_losing_streaks(daily_stats: List[Dict]) -> List[Dict]:
    """
    分析连输数据
    返回连输期间列表
    """
    losing_streaks = []
    current_streak = None
    
    for stat in daily_stats:
        if not stat['is_win']:  # 输了
            if current_streak is None:
                # 开始新的连输
                current_streak = {
                    'start_date': stat['date'],
                    'end_date': stat['date'],
                    'days': 1,
                    'total_loss': stat['loss_amount'],
                    'daily_losses': [stat['loss_amount']],
                    'game_counts': [stat['game_count']]
                }
            else:
                # 继续连输
                current_streak['end_date'] = stat['date']
                current_streak['days'] += 1
                current_streak['total_loss'] += stat['loss_amount']
                current_streak['daily_losses'].append(stat['loss_amount'])
                current_streak['game_counts'].append(stat['game_count'])
        else:  # 赢了
            if current_streak is not None:
                # 连输结束
                losing_streaks.append(current_streak)
                current_streak = None
    
    # 如果最后一天还在连输，也记录下来
    if current_streak is not None:
        losing_streaks.append(current_streak)
    
    return losing_streaks

def format_date(date_str: str) -> str:
    """格式化日期为 x月x号 格式"""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return f"{date_obj.month}月{date_obj.day}号"
    except:
        return date_str

def generate_markdown_report(losing_streaks: List[Dict], location_name: Optional[str] = None) -> str:
    """生成Markdown报告"""
    if location_name:
        title = f"# {location_name} 连输统计报告"
    else:
        title = "# 全局连输统计报告"
    
    report = [title, ""]
    report.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"统计连输次数：{len(losing_streaks)} 次")
    report.append("")
    
    if not losing_streaks:
        report.append("## 无连输记录")
        return "\n".join(report)
    
    # 按连输天数排序
    losing_streaks_sorted = sorted(losing_streaks, key=lambda x: x['days'], reverse=True)
    
    report.append("## 连输记录（按天数降序）")
    report.append("")
    report.append("| 序号 | 连输期间 | 天数 | 总输金额 | 日均输额 | 场次 |")
    report.append("|------|----------|------|----------|----------|------|")
    
    for i, streak in enumerate(losing_streaks_sorted, 1):
        start_date_fmt = format_date(streak['start_date'])
        end_date_fmt = format_date(streak['end_date'])
        period = f"{start_date_fmt} - {end_date_fmt}"
        days = streak['days']
        total_loss = streak['total_loss']
        avg_loss = total_loss / days
        total_games = sum(streak['game_counts'])
        
        report.append(f"| {i} | {period} | {days} | {total_loss:,} | {avg_loss:,.0f} | {total_games} |")
    
    report.append("")
    
    # 统计分析
    report.append("## 统计分析")
    report.append("")
    
    if losing_streaks:
        total_losses = [streak['total_loss'] for streak in losing_streaks]
        days_list = [streak['days'] for streak in losing_streaks]
        daily_losses_all = []
        for streak in losing_streaks:
            daily_losses_all.extend(streak['daily_losses'])
        
        # 基本统计
        report.append(f"- **最少连输金额**：{min(total_losses):,}")
        report.append(f"- **最多连输金额**：{max(total_losses):,}")
        report.append(f"- **平均连输金额**：{statistics.mean(total_losses):,.0f}")
        report.append(f"- **中位数连输金额**：{statistics.median(total_losses):,.0f}")
        report.append("")
        
        report.append(f"- **最短连输天数**：{min(days_list)} 天")
        report.append(f"- **最长连输天数**：{max(days_list)} 天")
        report.append(f"- **平均连输天数**：{statistics.mean(days_list):.1f} 天")
        report.append("")
        
        # 金额覆盖分析
        report.append("### 金额覆盖分析")
        report.append("")
        
        # 计算百分位数
        if daily_losses_all:
            daily_losses_sorted = sorted(daily_losses_all)
            percentiles = [50, 75, 90, 95, 99]
            
            for p in percentiles:
                idx = int(len(daily_losses_sorted) * p / 100) - 1
                idx = max(0, min(idx, len(daily_losses_sorted) - 1))
                value = daily_losses_sorted[idx]
                report.append(f"- **{p}% 的输钱日**：日输额 ≤ {value:,.0f}")
            
            report.append("")
            
            # 建议金额
            p95_value = daily_losses_sorted[int(len(daily_losses_sorted) * 0.95) - 1]
            p99_value = daily_losses_sorted[int(len(daily_losses_sorted) * 0.99) - 1]
            
            report.append("### 建议准备金额")
            report.append("")
            report.append(f"根据历史数据分析，建议准备以下金额以覆盖大部分情况：")
            report.append(f"- **覆盖 95% 情况**：{p95_value:,.0f}（单日最大输额）")
            report.append(f"- **覆盖 99% 情况**：{p99_value:,.0f}（极端情况）")
            report.append(f"- **覆盖最长连输**：{max(total_losses):,}（历史最长连输总金额）")
            report.append("")
            report.append("> 注意：建议金额仅供参考，实际应根据个人风险承受能力调整。")
    
    return "\n".join(report)

def save_report(report: str, output_path: str):
    """保存报告到文件"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"报告已保存到：{output_path}")

def main():
    parser = argparse.ArgumentParser(
        description='连输统计脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 全局统计（所有地点）
  python losing_streak_analysis.py --output "全局报告.md"
  
  # 指定地点统计
  python losing_streak_analysis.py --location "紫竹郡" --output "紫竹郡报告.md"
  
  # 指定数据库路径
  python losing_streak_analysis.py --db "../backend/data/griffin.db" --output "报告.md"
  
  # 保存JSON数据
  python losing_streak_analysis.py --output "报告.md" --json "数据.json"
        """
    )
    parser.add_argument('--db', required=True, help='数据库路径（例如：../backend/data/griffin.db）')
    parser.add_argument('--location', help='指定地点名称（如：紫竹郡、花漾涧）')
    parser.add_argument('--output', required=True, help='输出Markdown文件路径（必须提供）')
    parser.add_argument('--json', help='输出JSON文件路径（可选）')
    
    args = parser.parse_args()
    
    # 检查必要参数
    if not args.output:
        parser.print_help()
        print("\n错误：必须提供 --output 参数")
        return
    
    print("开始连输统计分析...")
    print(f"数据库：{args.db}")
    if args.location:
        print(f"指定地点：{args.location}")
    
    # 连接数据库
    conn = connect_db(args.db)
    
    # 获取我的玩家ID
    player_ids = get_my_player_ids(conn)
    if not player_ids:
        print("错误：未找到'我'的玩家记录")
        return
    
    print(f"找到 {len(player_ids)} 个'我'的玩家ID：{player_ids}")
    
    # 获取每日统计
    daily_stats = get_daily_stats(conn, player_ids, args.location)
    print(f"分析 {len(daily_stats)} 天的数据")
    
    if not daily_stats:
        print("无数据可分析")
        return
    
    # 分析连输
    losing_streaks = analyze_losing_streaks(daily_stats)
    print(f"发现 {len(losing_streaks)} 次连输")
    
    # 生成报告
    report = generate_markdown_report(losing_streaks, args.location)
    
    # 保存报告
    save_report(report, args.output)
    
    # 可选：保存JSON数据
    if args.json:
        data = {
            'daily_stats': daily_stats,
            'losing_streaks': losing_streaks,
            'analysis_time': datetime.now().isoformat(),
            'location': args.location
        }
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"JSON数据已保存到：{args.json}")
    
    # 打印摘要
    print("\n=== 分析摘要 ===")
    print(f"总天数：{len(daily_stats)}")
    print(f"赢钱天数：{sum(1 for s in daily_stats if s['is_win'])}")
    print(f"输钱天数：{sum(1 for s in daily_stats if not s['is_win'])}")
    
    if losing_streaks:
        longest_streak = max(losing_streaks, key=lambda x: x['days'])
        biggest_loss = max(losing_streaks, key=lambda x: x['total_loss'])
        
        print(f"最长连输：{longest_streak['days']}天 ({longest_streak['start_date']} 到 {longest_streak['end_date']})")
        print(f"最大连输金额：{biggest_loss['total_loss']:,} ({biggest_loss['start_date']} 到 {biggest_loss['end_date']})")
    
    conn.close()
    print("\n分析完成！")

if __name__ == '__main__':
    main()
