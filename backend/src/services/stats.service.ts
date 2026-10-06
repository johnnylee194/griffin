import db from '../database';
import { Lunar } from 'lunar-javascript';
import { getLocalDate, getLocalDateString } from '../utils/time';

export interface DailyCumulativeStat {
  date: string;
  dailyProfit: number;
  gameCount: number;
  cumulativeProfit: number | null;
}

export interface MonthlyStats {
  month: string;
  availableLocations: Array<{ id: string; name: string }>;
  earliestMonth: { year: number; month: number } | null;
  overall: StatSummary;
  lateNight: StatSummary;
  morning: StatSummary;
  afternoon: StatSummary;
  evening: StatSummary;
  byGameType: Record<string, GameTypeStat>;
  byLocation: Record<string, LocationStat>;
  dailyCumulative: DailyCumulativeStat[];
}

export interface StatSummary {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  totalGames: number;
  winGames: number;
  loseGames: number;
  winRate: number;
}

export interface GameTypeStat extends StatSummary {
  name: string;
}

export interface LocationStat extends StatSummary {
  name: string;
}

export class StatsService {
  static getMonthlyStats(userId: string, year: number, month: number, locationId?: string): MonthlyStats {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayOfNextMonth = new Date(year, month, 1);

    const startDate = firstDayOfMonth.toISOString();
    const endDate = firstDayOfNextMonth.toISOString();

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      throw new Error('Current user not found, please create "我" player first');
    }

    let query = `
      SELECT
        pr.chips,
        g.created_at as createdAt,
        g.game_type_id as gameTypeId,
        gt.name as gameTypeName,
        g.location_id as locationId,
        l.name as locationName
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      LEFT JOIN game_types gt ON g.game_type_id = gt.id
      LEFT JOIN locations l ON g.location_id = l.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
    `;
    const params: any[] = [mePlayer.id, userId, startDate, endDate];

    if (locationId) {
      query += ` AND g.location_id = ?`;
      params.push(locationId);
    }

    query += ` ORDER BY g.created_at ASC`;
    const records = db.prepare(query).all(...params) as any[];

    // Calculate daily cumulative stats
    const chinaTime = getLocalDate();
    const isCurrentMonth = chinaTime.getUTCFullYear() === year && (chinaTime.getUTCMonth() + 1) === month;
    const isPastMonth = chinaTime.getUTCFullYear() > year || (chinaTime.getUTCFullYear() === year && (chinaTime.getUTCMonth() + 1) > month);
    const todayDateStr = getLocalDateString(chinaTime);

    // Get number of days in the requested month
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyData: Record<string, { profit: number; games: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyData[dateStr] = { profit: 0, games: 0 };
    }

    records.forEach(record => {
      // Group by East 8 timezone date
      const recordDateStr = getLocalDateString(record.createdAt);

      if (dailyData[recordDateStr]) {
        dailyData[recordDateStr].profit += (record.chips || 0);
        dailyData[recordDateStr].games += 1;
      }
    });

    const dailyCumulative: DailyCumulativeStat[] = [];
    let currentCumulative = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      let shouldCalculate = false;
      if (isPastMonth) {
        shouldCalculate = true;
      } else if (isCurrentMonth) {
        if (dateStr <= todayDateStr) {
          shouldCalculate = true;
        }
      } // isFutureMonth -> shouldCalculate = false

      if (shouldCalculate) {
        const dailyProfit = dailyData[dateStr].profit;
        currentCumulative += dailyProfit;
        dailyCumulative.push({
          date: dateStr,
          dailyProfit,
          gameCount: dailyData[dateStr].games,
          cumulativeProfit: currentCumulative
        });
      } else {
        dailyCumulative.push({
          date: dateStr,
          dailyProfit: 0,
          gameCount: 0,
          cumulativeProfit: null
        });
      }
    }

    // Get available locations
    const locationQuery = `
      SELECT DISTINCT g.location_id, l.name
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      JOIN locations l ON g.location_id = l.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND l.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY l.name
    `;
    const availableLocations = db.prepare(locationQuery).all(mePlayer.id, userId, userId, startDate, endDate) as any[];

    // Get earliest month
    const earliestDateQuery = `
      SELECT MIN(g.created_at) as earliest_date
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND pr.chips IS NOT NULL
    `;
    const earliestDateResult = db.prepare(earliestDateQuery).get(mePlayer.id, userId) as any;
    let earliestMonth = null;
    if (earliestDateResult && earliestDateResult.earliest_date) {
      const date = new Date(earliestDateResult.earliest_date);
      earliestMonth = {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
    }

    const initialStat = (): StatSummary => ({
      totalIncome: 0,
      totalExpense: 0,
      profit: 0,
      totalGames: 0,
      winGames: 0,
      loseGames: 0,
      winRate: 0
    });

    const overall = initialStat();
    const lateNight = initialStat();
    const morning = initialStat();
    const afternoon = initialStat();
    const evening = initialStat();
    const byGameType: Record<string, GameTypeStat> = {};
    const byLocation: Record<string, LocationStat> = {};

    records.forEach(record => {
      const chips = record.chips || 0;
      const gameTime = new Date(record.createdAt);
      const hour = gameTime.getHours();
      const minute = gameTime.getMinutes();
      const second = gameTime.getSeconds();
      const ts = hour * 3600 + minute * 60 + second;

      const updateStat = (stat: StatSummary) => {
        stat.totalGames++;
        if (chips > 0) {
          stat.totalIncome += chips;
          stat.winGames++;
        } else if (chips < 0) {
          stat.totalExpense += Math.abs(chips);
          stat.loseGames++;
        }
      };

      updateStat(overall);

      // (0, 8h] Late Night, (8h, 12h] Morning, (12h, 18h] Afternoon, Else Evening
      if (ts > 0 && ts <= 8 * 3600) {
        updateStat(lateNight);
      } else if (ts > 8 * 3600 && ts <= 12 * 3600) {
        updateStat(morning);
      } else if (ts > 12 * 3600 && ts <= 18 * 3600) {
        updateStat(afternoon);
      } else {
        updateStat(evening);
      }

      const gtId = record.gameTypeId || 'unknown';
      if (!byGameType[gtId]) {
        byGameType[gtId] = { ...initialStat(), name: record.gameTypeName || '未知玩法' };
      }
      updateStat(byGameType[gtId]);

      const locId = record.locationId || 'unknown';
      if (!byLocation[locId]) {
        byLocation[locId] = { ...initialStat(), name: record.locationName || '未知地点' };
      }
      updateStat(byLocation[locId]);
    });

    const finalizeStat = (stat: StatSummary) => {
      stat.profit = stat.totalIncome - stat.totalExpense;
      stat.winRate = stat.totalGames > 0 ? Math.round((stat.winGames / stat.totalGames) * 100) : 0;
    };

    finalizeStat(overall);
    finalizeStat(lateNight);
    finalizeStat(morning);
    finalizeStat(afternoon);
    finalizeStat(evening);
    Object.values(byGameType).forEach(finalizeStat);
    Object.values(byLocation).forEach(finalizeStat);

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      availableLocations: availableLocations.map(loc => ({ id: loc.location_id, name: loc.name })),
      earliestMonth,
      overall,
      lateNight,
      morning,
      afternoon,
      evening,
      byGameType,
      byLocation,
      dailyCumulative
    };
  }

  static getAnnualStats(userId: string, year: number, useLunar: boolean = false) {
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      throw new Error('Current user not found');
    }

    let startDate: string;
    let endDate: string;
    let resultYear: number;

    if (useLunar) {
      // Use lunar-javascript to get the solar date range of the lunar year
      const lunar = (Lunar as any).fromYmd(year, 1, 1);
      const solarStart = lunar.getSolar();

      // Get the last day of this lunar year (day before next lunar year's first day)
      const nextLunar = (Lunar as any).fromYmd(year + 1, 1, 1);
      const solarEnd = nextLunar.getSolar();

      startDate = `${solarStart.toYmd()}T00:00:00`;
      endDate = `${solarEnd.toYmd()}T00:00:00`;
      resultYear = year;
    } else {
      startDate = `${year}-01-01T00:00:00`;
      endDate = `${year + 1}-01-01T00:00:00`;
      resultYear = year;
    }

    const records = db.prepare(`
      SELECT pr.chips, pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
    `).all(mePlayer.id, userId, startDate, endDate) as any[];

    let income = 0;
    let expense = 0;
    let wins = 0;
    let losses = 0;

    records.forEach(r => {
      if (r.chips > 0) {
        income += r.chips;
        wins++;
      } else if (r.chips < 0) {
        expense += Math.abs(r.chips);
        losses++;
      }
    });

    const totalGames = wins + losses;
    return {
      year: resultYear,
      startDate: startDate.split('T')[0],
      endDate: endDate.split('T')[0],
      overall: {
        income,
        expense,
        profit: income - expense,
        wins,
        losses,
        totalGames,
        winRate: totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(2)) : 0
      }
    };
  }
}
