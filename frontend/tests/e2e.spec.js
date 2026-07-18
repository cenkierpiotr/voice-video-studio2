// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Voice & Video Studio AI — E2E', () => {

  test('1. Page loads — React renders, no critical JS errors', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', err => {
      if (!err.message.includes('favicon') && !err.message.includes('ResizeObserver')) {
        jsErrors.push(err.message);
      }
    });

    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });
    expect(jsErrors).toHaveLength(0);
  });

  test('2. Dashboard tab loads with hardware info', async ({ page }) => {
    await page.goto('/');
    const dashBtn = page.locator('.nav-item', { hasText: 'Dashboard' });
    if (await dashBtn.count() > 0) await dashBtn.click();
    await expect(page.locator('text=/GPU|NVIDIA|hardware|vram/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Navigate all main tabs without crashing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });

    const tabsToTest = ['Lektor', 'Klonowanie', 'Dialog', 'Prezentacja', 'Historia', 'Ustawienia'];

    for (const tabText of tabsToTest) {
      const btn = page.locator('.nav-item', { hasText: tabText }).first();
      if (await btn.count() > 0) {
        await btn.click();
        const errorBoundary = page.locator('text=/Something went wrong|Błąd krytyczny/i');
        await expect(errorBoundary).toHaveCount(0);
      }
    }
  });

  test('4. TTS form — text input and Generuj button state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });

    const lektorBtn = page.locator('.nav-item', { hasText: 'Lektor' }).first();
    if (await lektorBtn.count() > 0) await lektorBtn.click();

    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.fill('Test nagrania głosowego');
      const generateBtn = page.locator('button', { hasText: /Generuj|Generate/i }).first();
      if (await generateBtn.count() > 0) {
        await expect(generateBtn).not.toBeDisabled();
      }
    }
  });

  test('5. Historia tab — file list loads and checkboxes work', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });

    const historiaBtn = page.locator('.nav-item', { hasText: 'Historia' }).first();
    if (await historiaBtn.count() > 0) {
      await historiaBtn.click();
      await page.waitForTimeout(2000);

      const hasFiles = await page.locator('input[type="checkbox"]').count();
      const hasEmpty = await page.locator('text=/Brak plików/i').count();
      expect(hasFiles + hasEmpty).toBeGreaterThan(0);

      if (hasFiles > 0) {
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        await firstCheckbox.check();
        const downloadBtn = page.locator('button', { hasText: /Pobierz zaznaczone/i }).first();
        await expect(downloadBtn).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('6. Settings — Ollama host field is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });

    const settingsBtn = page.locator('.nav-item', { hasText: 'Ustawienia' }).first();
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();

      const ollamaInput = page.locator('input[placeholder*="localhost:11434"]').first();
      if (await ollamaInput.count() > 0) {
        await expect(ollamaInput).toBeVisible();
        const val = await ollamaInput.inputValue();
        expect(val).toContain('11434');
      }
    }
  });

  test('7. API health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.version).toBe('2.0.0');
  });

  test('8. API voices endpoint returns voice list', async ({ request }) => {
    const response = await request.get('/api/voices');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.voices).toBeTruthy();
    expect(Object.keys(json.voices).length).toBeGreaterThan(0);
    expect(json.voices['pl_male_marek']).toBeTruthy();
  });

  test('9. API generate (edge-tts) returns audio URL', async ({ request }) => {
    const response = await request.post('/api/generate', {
      data: {
        segments: [{ speaker_key: 'pl_male_marek', text: 'Test', rate: '+0%', pitch: '+0Hz' }],
        silence_between_ms: 0,
        style: 'normal',
      },
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.url).toMatch(/^\/api\/audio\//);
    expect(json.job_id).toBeTruthy();
  });

  test('10. No nav item causes crash on click', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-item').first()).toBeVisible({ timeout: 15000 });

    const navItems = page.locator('.nav-item');
    const count = await navItems.count();
    expect(count).toBeGreaterThan(3);

    for (let i = 0; i < count; i++) {
      await navItems.nth(i).click();
      const notFound = page.locator('text=/404|Page not found/i');
      await expect(notFound).toHaveCount(0);
    }
  });

});
