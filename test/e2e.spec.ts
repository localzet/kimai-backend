import axios from 'axios';

const BASE = process.env.BASE_URL || 'http://localhost:3001';

describe('E2E smoke', () => {
  it('health endpoint returns ok', async () => {
    const res = await axios.get(`${BASE}/api/health`, { timeout: 5000 });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('ok', true);
  }, 15000);
});
