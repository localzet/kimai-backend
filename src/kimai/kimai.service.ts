import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { Injectable, Logger } from '@nestjs/common';

export interface KimaiConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export class KimaiClient {
  private inst: AxiosInstance;

  constructor(private cfg: KimaiConfig) {
    const base = (cfg.apiUrl || '').replace(/\/+$/, '');
    this.inst = axios.create({
      baseURL: base,
      timeout: cfg.timeoutMs ?? 15_000,
      headers: { 'X-AUTH-API-TOKEN': cfg.apiKey },
    });

    // Retries with exponential backoff for idempotent requests
    axiosRetry(this.inst, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // retry on network errors or 5xx
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || !!(error.response && error.response.status >= 500);
      },
    });
  }

  async getProjects(): Promise<any[]> {
    const out: any[] = [];
    const size = 100;
    let page = 1;
    while (true) {
      const res = await this.inst.get('/api/projects', { params: { page, size } });
      const data = res.data as any[];
      if (!Array.isArray(data) || data.length === 0) break;
      out.push(...data);
      if (data.length < size) break;
      page++;
    }
    return out;
  }

  async getTags(): Promise<any[]> {
    const res = await this.inst.get('/api/tags');
    return res.data || [];
  }

  async getActivities(): Promise<any[]> {
    const res = await this.inst.get('/api/activities');
    return res.data || [];
  }

  // Generic paginator for timesheets and other endpoints supporting page+size
  async *paginate(path: string, params: Record<string, any> = {}, size = 100) {
    let page = 1;
    while (true) {
      const res = await this.inst.get(path, { params: { ...params, page, size } });
      const data = Array.isArray(res.data) ? res.data : [];
      if (!data || data.length === 0) break;
      for (const item of data) yield item;
      if (data.length < size) break;
      page++;
    }
  }

  async getTimesheets(sinceIso: string, untilIso: string): Promise<any[]> {
    const out: any[] = [];
    for await (const t of this.paginate('/api/timesheets', { begin: sinceIso, end: untilIso }, 200)) {
      out.push(t);
    }
    return out;
  }

  // Validate credentials by calling /api/users/current
  async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.inst.get('/api/users/current');
      return res.status >= 200 && res.status < 300;
    } catch (e) {
      return false;
    }
  }
}

@Injectable()
export class KimaiService {
  private readonly logger = new Logger(KimaiService.name);

  constructor() {}

  getClient(cfg: KimaiConfig) {
    return new KimaiClient(cfg);
  }

  async getProjects(cfg: KimaiConfig): Promise<any[]> {
    try {
      const client = this.getClient(cfg);
      return await client.getProjects();
    } catch (e) {
      this.logger.warn('Failed to fetch projects from Kimai: ' + e);
      return [];
    }
  }

  async getTimesheets(cfg: KimaiConfig, sinceIso: string, untilIso: string): Promise<any[]> {
    const client = this.getClient(cfg);
    return client.getTimesheets(sinceIso, untilIso);
  }

  async validateCredentials(cfg: KimaiConfig): Promise<boolean> {
    const client = this.getClient(cfg);
    return client.validateCredentials();
  }
}
