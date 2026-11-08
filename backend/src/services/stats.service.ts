import db from '../database';
import { Lunar } from 'lunar-javascript';
import {
  getLocalDate,
  getLocalDateString,
  getLogicalDateString,
  getTimeSlot,
  getLogicalTimestampRange
} from '../utils/time';
import { GameService } from './game.service';

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
  morning: StatSummary;
  afternoon: StatSummary;
  evening: StatSummary;
  lateNight: StatSummary;
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

export interface DailyBattleStats {
  logicalDate: string;
  totalGames: number;
  totalProfit: number;
  morningProfit: number;
  afternoonProfit: number;
  eveningProfit: number;
  lateNightProfit: number;
  games: any[];
}

export class StatsService {
  static getMonthlyStats(userId: string, year: number, month: number, locationId?: string): MonthlyStats {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstLogicalDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastLogicalDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const { startTimestamp, endTimestamp } = getLogicalTimestampRange(firstLogicalDate, lastLogicalDate);

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
        AND g.created_at <= ?
    `;
    const params: any[] = [mePlayer.id, userId, startTimestamp, endTimestamp];

    if (locationId) {
      query += ` AND g.location_id = ?`;
      params.push(locationId);
    }

    query += ` ORDER BY g.created_at ASC`;
    const records = db.prepare(query).all(...params) as any[];

    // Calculate daily cumulative stats based on logical date
    const todayLogicalDate = getLogicalDateString();
    const [currentLogicalYear, currentLogicalMonth] = todayLogicalDate.split('-').map(Number);
    const isCurrentMonth = currentLogicalYear === year && currentLogicalMonth === month;
    const isPastMonth = currentLogicalYear > year || (currentLogicalYear === year && currentLogicalMonth > month);

    const dailyData: Record<string, { profit: number; games: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyData[dateStr] = { profit: 0, games: 0 };
    }

    records.forEach(record => {
      const recordDateStr = getLogicalDateString(record.createdAt);
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
        if (dateStr <= todayLogicalDate) {
          shouldCalculate = true;
        }
      }

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
        AND g.created_at <= ?
      ORDER BY l.name
    `;
    const availableLocations = db.prepare(locationQuery).all(mePlayer.id, userId, userId, startTimestamp, endTimestamp) as any[];

    // Get earliest month in logical dates
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
      const earliestLogicalDate = getLogicalDateString(earliestDateResult.earliest_date);
      const [ey, em] = earliestLogicalDate.split('-').map(Number);
      earliestMonth = {
        year: ey,
        month: em
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
    const morning = initialStat();
    const afternoon = initialStat();
    const evening = initialStat();
    const lateNight = initialStat();
    const byGameType: Record<string, GameTypeStat> = {};
    const byLocation: Record<string, LocationStat> = {};

    records.forEach(record => {
      const chips = record.chips || 0;
      const slot = getTimeSlot(record.createdAt);

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

      if (slot === 'morning') {
        updateStat(morning);
      } else if (slot === 'afternoon') {
        updateStat(afternoon);
      } else if (slot === 'evening') {
        updateStat(evening);
      } else {
        updateStat(lateNight);
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
    finalizeStat(morning);
    finalizeStat(afternoon);
    finalizeStat(evening);
    finalizeStat(lateNight);
    Object.values(byGameType).forEach(finalizeStat);
    Object.values(byLocation).forEach(finalizeStat);

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      availableLocations: availableLocations.map(loc => ({ id: loc.location_id, name: loc.name })),
      earliestMonth,
      overall,
      morning,
      afternoon,
      evening,
      lateNight,
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

    let startTimestamp: string;
    let endTimestamp: string;
    let resultYear: number;
    let displayStartDate: string;
    let displayEndDate: string;

    if (useLunar) {
      const lunar = (Lunar as any).fromYmd(year, 1, 1);
      const solarStart = lunar.getSolar();
      const nextLunar = (Lunar as any).fromYmd(year + 1, 1, 1);
      const solarEnd = nextLunar.getSolar();

      displayStartDate = solarStart.toYmd();
      displayEndDate = solarEnd.toYmd();
      startTimestamp = `${displayStartDate}T08:00:01`;
      endTimestamp = `${displayEndDate}T08:00:00`;
      resultYear = year;
    } else {
      displayStartDate = `${year}-01-01`;
      displayEndDate = `${year}-12-31`;
      const range = getLogicalTimestampRange(displayStartDate, displayEndDate);
      startTimestamp = range.startTimestamp;
      endTimestamp = range.endTimestamp;
      resultYear = year;
    }

    const records = db.prepare(`
      SELECT pr.chips, pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at <= ?
    `).all(mePlayer.id, userId, startTimestamp, endTimestamp) as any[];

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
      startDate: displayStartDate,
      endDate: displayEndDate,
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

  static getDailyBattleStats(userId: string, logicalDate?: string, locationId?: string): DailyBattleStats {
    const targetDate = logicalDate || getLogicalDateString();
    const { startTimestamp, endTimestamp } = getLogicalTimestampRange(targetDate, targetDate);

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      throw new Error('Current user not found');
    }

    let query = `
      SELECT g.id, g.created_at, pr.chips
      FROM games g
      JOIN player_records pr ON g.id = pr.game_id
      WHERE g.user_id = ?
        AND pr.player_id = ?
        AND g.created_at >= ?
        AND g.created_at <= ?
    `;
    const params: any[] = [userId, mePlayer.id, startTimestamp, endTimestamp];

    if (locationId) {
      query += ` AND g.location_id = ?`;
      params.push(locationId);
    }

    query += ` ORDER BY g.created_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];

    let totalProfit = 0;
    let morningProfit = 0;
    let afternoonProfit = 0;
    let eveningProfit = 0;
    let lateNightProfit = 0;

    const gameIds: string[] = [];
    rows.forEach(r => {
      gameIds.push(r.id);
      const chips = r.chips || 0;
      totalProfit += chips;
      const slot = getTimeSlot(r.created_at);
      if (slot === 'morning') morningProfit += chips;
      else if (slot === 'afternoon') afternoonProfit += chips;
      else if (slot === 'evening') eveningProfit += chips;
      else lateNightProfit += chips;
    });

    const fullGames = gameIds.map(id => GameService.getGameWithDetails(id, userId)).filter(Boolean);

    return {
      logicalDate: targetDate,
      totalGames: fullGames.length,
      totalProfit,
      morningProfit,
      afternoonProfit,
      eveningProfit,
      lateNightProfit,
      games: fullGames
    };
  }
}
