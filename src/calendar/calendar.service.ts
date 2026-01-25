import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

interface CalendarSyncSettings {
  enabled: boolean;
  syncType: 'notion' | 'google';
  notionApiKey?: string;
  notionDatabaseId?: string;
  googleCredentials?: any;
  googleCalendarId?: string;
  syncPastDays: number;
  syncFutureDays: number;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  async syncUserCalendar(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { calendarSync: true }
    });

    if (!settings?.calendarSync) {
      return { success: false, message: 'Calendar sync not configured' };
    }

    const calendarSettings: CalendarSyncSettings = settings.calendarSync as any;

    if (!calendarSettings.enabled) {
      return { success: false, message: 'Calendar sync disabled' };
    }

    try {
      // Get recent timesheets for sync
      const now = new Date();
      const pastDays = calendarSettings.syncPastDays || 30;
      const futureDays = calendarSettings.syncFutureDays || 7;
      const startDate = new Date(now.getTime() - pastDays * 24 * 3600 * 1000);
      const endDate = new Date(now.getTime() + futureDays * 24 * 3600 * 1000);

      const timesheets = await this.prisma.timesheet.findMany({
        where: {
          userId,
          begin: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { begin: 'asc' }
      });

      if (calendarSettings.syncType === 'notion') {
        return await this.syncToNotion(timesheets, calendarSettings);
      } else if (calendarSettings.syncType === 'google') {
        return await this.syncToGoogle(timesheets, calendarSettings);
      } else {
        return { success: false, message: 'Unknown sync type' };
      }
    } catch (error) {
      this.logger.error(`Calendar sync failed for user ${userId}:`, error);
      return { success: false, message: (error as Error).message };
    }
  }

  private async syncToNotion(timesheets: any[], settings: CalendarSyncSettings) {
    if (!settings.notionApiKey || !settings.notionDatabaseId) {
      throw new Error('Notion API key or database ID not configured');
    }

    const notion = new Client({ auth: settings.notionApiKey });
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const entry of timesheets) {
      try {
        // Check if entry already exists in Notion
        const existing = await (notion.databases as any).query({
          database_id: settings.notionDatabaseId,
          filter: {
            property: 'Kimai ID',
            number: {
              equals: entry.kimaiId
            }
          }
        });

        const properties = {
          'Name': {
            title: [{ text: { content: entry.description || `${entry.projectName} - ${entry.activityName}` } }]
          },
          'Date': {
            date: {
              start: entry.begin.toISOString(),
              end: entry.end?.toISOString()
            }
          },
          'Duration': {
            number: entry.duration ? entry.duration / 3600 : 0 // Convert to hours
          },
          'Project': {
            rich_text: [{ text: { content: entry.projectName || 'Unknown' } }]
          },
          'Activity': {
            rich_text: [{ text: { content: entry.activityName || 'Unknown' } }]
          },
          'Kimai ID': {
            number: entry.kimaiId
          }
        };

        if (existing.results.length > 0) {
          // Update existing
          await notion.pages.update({
            page_id: existing.results[0].id,
            properties
          });
          updated++;
        } else {
          // Create new
          await notion.pages.create({
            parent: { database_id: settings.notionDatabaseId },
            properties
          });
          created++;
        }
      } catch (error) {
        this.logger.error(`Failed to sync timesheet ${entry.id} to Notion:`, error);
        errors++;
      }
    }

    return { success: true, created, updated, errors };
  }

  private async syncToGoogle(timesheets: any[], settings: CalendarSyncSettings) {
    if (!settings.googleCredentials || !settings.googleCalendarId) {
      throw new Error('Google credentials or calendar ID not configured');
    }

    // This would require Google Calendar API setup
    // For now, return not implemented
    this.logger.warn('Google Calendar sync not yet implemented');
    return { success: false, message: 'Google Calendar sync not implemented' };
  }
}