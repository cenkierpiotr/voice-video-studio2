import { test, expect } from '@playwright/test';

const API = 'http://localhost:47821';

test.describe('Voice & Video Studio AI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell-v2', { timeout: 10000 });
  });

  // ── Layout & Navigation ────────────────────────────────────────────────────

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.locator('.app-nav')).toBeVisible();
    await expect(page.locator('.app-header-v2')).toBeVisible();
    // Use exact class to avoid strict mode violation with text appearing elsewhere
    await expect(page.locator('.nav-group-label').filter({ hasText: 'Dźwięk' })).toBeVisible();
    await expect(page.locator('.nav-group-label').filter({ hasText: 'Wideo' })).toBeVisible();
    await expect(page.locator('.nav-group-label').filter({ hasText: 'Scenariusze' })).toBeVisible();
  });

  test('dashboard loads with quick-start cards', async ({ page }) => {
    await expect(page.locator('.dashboard-grid, .quick-card').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.app-header-v2')).toContainText('Studio AI');
  });

  // ── TTS / Lektor ───────────────────────────────────────────────────────────

  test('lektor tab: generates audio', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Lektor' }).click();
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Witaj świecie, to jest test.');
    await page.locator('button').filter({ hasText: 'Generuj nagranie' }).click();
    await expect(page.locator('audio').first()).toBeVisible({ timeout: 30000 });
  });

  // ── Voice Cloner ───────────────────────────────────────────────────────────

  test('mój głos tab loads with upload zone', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Mój Głos' }).click();
    // VoiceCloner has a file input and speaker name input
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 5000 });
    await expect(page.locator('input[type="text"], input[placeholder]').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  test('ustawienia: all 5 tabs are clickable', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Ustawienia' }).click();
    await expect(page.locator('.settings-tabs')).toBeVisible({ timeout: 5000 });

    const tabs = ['Integracje', 'Głos i TTS', 'Sprzęt', 'Bezpieczeństwo', 'Pliki'];
    for (const tabName of tabs) {
      const tab = page.locator('.settings-tab').filter({ hasText: tabName });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(tab).toHaveClass(/active/);
    }
  });

  // ── Transcription ──────────────────────────────────────────────────────────

  test('transkrypcja tab loads correctly', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Transkrypcja' }).click();
    await expect(page.locator('.drop-area').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: 'Transkrybuj' })).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  // ── Mixer ──────────────────────────────────────────────────────────────────

  test('mikser tab: 3 tracks visible', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Mikser' }).click();
    await expect(page.locator('.mixer-track').first()).toBeVisible({ timeout: 5000 });
    const tracks = page.locator('.mixer-track');
    await expect(tracks).toHaveCount(3);
    await expect(page.locator('.track-name').filter({ hasText: 'Głos / Narracja' })).toBeVisible();
    await expect(page.locator('.track-name').filter({ hasText: 'Muzyka w tle' })).toBeVisible();
    await expect(page.locator('.track-name').filter({ hasText: 'Efekty dźwiękowe' })).toBeVisible();
  });

  // ── Music Studio ───────────────────────────────────────────────────────────

  test('muzyka AI tab: presets and prompt visible', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Muzyka AI' }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
    // Either shows presets or "not installed" message
    const hasPresets = await page.locator('.prompt-chip').count();
    const hasNotInstalled = await page.getByText('MusicGen nie jest zainstalowany').isVisible().catch(() => false);
    expect(hasPresets > 0 || hasNotInstalled).toBeTruthy();
  });

  // ── Presentation ───────────────────────────────────────────────────────────

  test('prezentacja tab: upload interface visible', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Prezentacja' }).click();
    // PresentationStudio has a file input for PPTX/PDF
    await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 5000 });
    // Should have a "Wczytaj" or similar button
    await expect(page.locator('button').first()).toBeVisible({ timeout: 5000 });
  });

  // ── History/Projects ───────────────────────────────────────────────────────

  test('projekty tab: session and files tabs exist', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Projekty' }).click();
    await expect(page.getByText('Ta sesja')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Wszystkie pliki')).toBeVisible();
  });

  // ── Avatar (ComingSoon) ────────────────────────────────────────────────────

  test('avatar shows coming soon', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Avatar' }).click();
    await expect(page.getByText('Wkrótce dostępne')).toBeVisible({ timeout: 5000 });
  });

  // ── API Endpoints ──────────────────────────────────────────────────────────

  test('API /api/ai/status returns gpu_available', async ({ request }) => {
    const res = await request.get(`${API}/api/ai/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.gpu_available).toBe('boolean');
  });

  test('API /api/voices returns voices object', async ({ request }) => {
    const res = await request.get(`${API}/api/voices`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('voices');
  });

  test('API /api/hardware returns capability matrix', async ({ request }) => {
    const res = await request.get(`${API}/api/hardware`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('cpu');
    expect(body).toHaveProperty('ram');
    expect(body).toHaveProperty('capabilities');
  });

  test('API /api/auth/check returns auth status', async ({ request }) => {
    const res = await request.get(`${API}/api/auth/check`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.password_enabled).toBe('boolean');
  });

  // ── New tabs: Audiobook, Video, Animation, Movie, Dialogue, Prompt AI ────

  test('audiobook tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Audiobook' }).click();
    // AudiobookStudio has file upload or textarea
    await expect(
      page.locator('input[type="file"], textarea').first()
    ).toBeAttached({ timeout: 5000 });
    await expect(page.locator('button').first()).toBeVisible();
  });

  test('video generator tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Generator' }).click();
    // VideoStudio has a prompt textarea or form
    await expect(page.locator('textarea, .form-textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('animation tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Animacja' }).click();
    await expect(page.locator('.app-content').first()).toBeVisible({ timeout: 5000 });
    // Should have some content with a button
    await expect(page.locator('button').first()).toBeVisible();
  });

  test('movie studio tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Film' }).click();
    await expect(page.locator('.app-content').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').first()).toBeVisible();
  });

  test('dialogue tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Dialog' }).click();
    await expect(page.locator('.app-content').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').first()).toBeVisible();
  });

  test('prompt builder tab loads', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Prompt AI' }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Queue & Night Mode API ──────────────────────────────────────────────────

  test('API /api/queue/status returns queue info', async ({ request }) => {
    const res = await request.get(`${API}/api/queue/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.running).toBe('boolean');
    expect(typeof body.queue_length).toBe('number');
    expect(Array.isArray(body.queued_jobs)).toBeTruthy();
  });

  test('API /api/settings/night-mode returns config', async ({ request }) => {
    const res = await request.get(`${API}/api/settings/night-mode`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.enabled).toBe('boolean');
    expect(typeof body.active_now).toBe('boolean');
    expect(typeof body.start_hour).toBe('number');
  });

  // ── Queue Manager tab ──────────────────────────────────────────────────────

  test('kolejka tab loads with queue manager', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: 'Kolejka' }).click();
    await expect(page.getByText('Kolejka zadań')).toBeVisible({ timeout: 5000 });
    // Should show empty or active state
    await expect(
      page.getByText('Kolejka pusta').or(page.getByText('Przetwarza'))
    ).toBeVisible({ timeout: 8000 });
  });
});
