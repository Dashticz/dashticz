// @ts-check
import { test, expect } from '@playwright/test';

function endpoint(base, suffix) {
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/$/, '') + suffix;
  url.search = '';
  url.hash = '';
  return url;
}

function originHeader(baseURL) {
  return { Origin: new URL(baseURL).origin };
}

test.describe('opt-in live integrations', () => {
  test('Domoticz responds to the real version API', async ({ request }) => {
    const base = process.env.DASHTICZ_LIVE_DOMOTICZ_URL;
    test.skip(!base, 'DASHTICZ_LIVE_DOMOTICZ_URL is not configured');

    const url = endpoint(base, '/json.htm');
    url.searchParams.set('type', 'command');
    url.searchParams.set('param', 'getversion');
    const username = process.env.DASHTICZ_LIVE_DOMOTICZ_USERNAME || '';
    const password = process.env.DASHTICZ_LIVE_DOMOTICZ_PASSWORD || '';
    const headers = username
      ? {
          Authorization:
            'Basic ' +
            Buffer.from(username + ':' + password).toString('base64'),
        }
      : undefined;

    const response = await request.get(url.toString(), { headers });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.status).toBe('OK');
    expect(String(result.version || '')).not.toBe('');
  });

  test('Lyrion Music Server responds through the Dashticz PHP bridge', async ({
    request,
    baseURL,
  }) => {
    const server = process.env.DASHTICZ_LIVE_LMS_HOST;
    test.skip(!server, 'DASHTICZ_LIVE_LMS_HOST is not configured');

    const response = await request.post('/vendor/dashticz/lms/index.php', {
      headers: originHeader(baseURL),
      data: {
        action: 'rpc',
        server,
        port: Number(process.env.DASHTICZ_LIVE_LMS_PORT || 9000),
        username: process.env.DASHTICZ_LIVE_LMS_USERNAME || '',
        password: process.env.DASHTICZ_LIVE_LMS_PASSWORD || '',
        player: '',
        params: ['serverstatus', 0, 999],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.error).toBeUndefined();
    expect(body.result).toEqual(expect.any(Object));
    expect(body.result.players_loop || []).toEqual(expect.any(Array));
  });

  test('calendar feed is fetched and parsed by the Dashticz PHP bridge', async ({
    request,
    baseURL,
  }) => {
    const feed = process.env.DASHTICZ_LIVE_ICAL_URL;
    test.skip(!feed, 'DASHTICZ_LIVE_ICAL_URL is not configured');

    const url = new URL('/vendor/dashticz/ical/index.php', baseURL);
    url.searchParams.set('url', feed);
    url.searchParams.set('method', '0');
    url.searchParams.set('maxitems', '10');
    const response = await request.get(url.toString(), {
      headers: originHeader(baseURL),
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body._errors).toEqual([]);
    expect(body).toEqual(expect.any(Object));
  });
});
