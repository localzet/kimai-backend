import { Controller, Get, UseGuards, Req, Query, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

interface WeekData {
  year: number;
  week: number;
  totalDuration: number;
  totalEarnings: number;
  entries: number;
  projects: Record<string, {
    name: string;
    duration: number;
    earnings: number;
    entries: number;
  }>;
  activities: Record<string, {
    name: string;
    duration: number;
    earnings: number;
    entries: number;
  }>;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('weeks')
  async getWeeks(@Req() req: any, @Query() query: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    // Get user settings for rate calculation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true }
    });

    const ratePerMinute = user?.settings?.ratePerMinute || 0;
    const excludedTags = user?.settings?.excludedTags || [];

    // Get timesheets for the last 12 weeks
    const twelveWeeksAgo = dayjs().subtract(12, 'weeks').startOf('week').toDate();
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        userId,
        begin: { gte: twelveWeeksAgo }
      },
      orderBy: { begin: 'desc' }
    });

    // Group by weeks
    const weeksMap = new Map<string, WeekData>();

    for (const entry of timesheets) {
      // Filter by excluded tags
      if (excludedTags.length > 0 && entry.tags?.some(tag => excludedTags.includes(tag.toLowerCase()))) {
        continue;
      }

      const entryDate = dayjs(entry.begin);
      const year = entryDate.year();
      const week = entryDate.isoWeek();
      const key = `${year}-${week}`;

      if (!weeksMap.has(key)) {
        weeksMap.set(key, {
          year,
          week,
          totalDuration: 0,
          totalEarnings: 0,
          entries: 0,
          projects: {},
          activities: {}
        });
      }

      const weekData = weeksMap.get(key)!;
      const duration = entry.duration || 0;
      const earnings = (duration / 60) * ratePerMinute; // Convert to minutes

      weekData.totalDuration += duration;
      weekData.totalEarnings += earnings;
      weekData.entries += 1;

      // Project aggregation
      const projectKey = entry.projectId?.toString() || 'unknown';
      if (!weekData.projects[projectKey]) {
        weekData.projects[projectKey] = {
          name: entry.projectName || 'Unknown Project',
          duration: 0,
          earnings: 0,
          entries: 0
        };
      }
      weekData.projects[projectKey].duration += duration;
      weekData.projects[projectKey].earnings += earnings;
      weekData.projects[projectKey].entries += 1;

      // Activity aggregation
      const activityKey = entry.activityId?.toString() || 'unknown';
      if (!weekData.activities[activityKey]) {
        weekData.activities[activityKey] = {
          name: entry.activityName || 'Unknown Activity',
          duration: 0,
          earnings: 0,
          entries: 0
        };
      }
      weekData.activities[activityKey].duration += duration;
      weekData.activities[activityKey].earnings += earnings;
      weekData.activities[activityKey].entries += 1;
    }

    // Convert to array and sort by year/week descending
    const weeks = Array.from(weeksMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });

    return { weeks };
  }

  @UseGuards(JwtAuthGuard)
  @Get('metrics')
  async getMetrics(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true }
    });

    const ratePerMinute = user?.settings?.ratePerMinute || 0;
    const excludedTags = user?.settings?.excludedTags || [];

    // Get data for current week and last week
    const now = dayjs();
    const currentWeekStart = now.startOf('isoWeek').toDate();
    const lastWeekStart = now.subtract(1, 'week').startOf('isoWeek').toDate();
    const lastWeekEnd = now.subtract(1, 'week').endOf('isoWeek').toDate();

    const [currentWeekEntries, lastWeekEntries] = await Promise.all([
      this.prisma.timesheet.findMany({
        where: {
          userId,
          begin: { gte: currentWeekStart }
        }
      }),
      this.prisma.timesheet.findMany({
        where: {
          userId,
          begin: { gte: lastWeekStart, lte: lastWeekEnd }
        }
      })
    ]);

    // Filter excluded tags
    const filterEntries = (entries: any[]) => {
      if (excludedTags.length === 0) return entries;
      return entries.filter(entry =>
        !entry.tags?.some((tag: string) => excludedTags.includes(tag.toLowerCase()))
      );
    };

    const currentFiltered = filterEntries(currentWeekEntries);
    const lastFiltered = filterEntries(lastWeekEntries);

    // Calculate metrics
    const currentDuration = currentFiltered.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const lastDuration = lastFiltered.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    const currentEarnings = (currentDuration / 60) * ratePerMinute;
    const lastEarnings = (lastDuration / 60) * ratePerMinute;

    const durationChange = lastDuration > 0 ? ((currentDuration - lastDuration) / lastDuration) * 100 : 0;
    const earningsChange = lastEarnings > 0 ? ((currentEarnings - lastEarnings) / lastEarnings) * 100 : 0;

    return {
      currentWeek: {
        duration: currentDuration,
        earnings: currentEarnings,
        entries: currentFiltered.length
      },
      lastWeek: {
        duration: lastDuration,
        earnings: lastEarnings,
        entries: lastFiltered.length
      },
      changes: {
        durationPercent: durationChange,
        earningsPercent: earningsChange
      }
    };
  }
}