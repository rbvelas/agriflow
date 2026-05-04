import { test, expect, Page } from '@playwright/test';

/**
 * Suite E2E — AgriFlow Dashboard
 * Cubre: carga del dashboard, visualización de métricas,
 * predicción ML, generación de PDF y navegación.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Intercepta la llamada tRPC de predicciones y responde con datos mock */
async function mockPredictionEndpoint(page: Page) {
  await page.route('**/trpc/predicciones.obtener**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            data: {
              id: 'aaaaaaaa-0000-0000-0000-000000000001',
              rendimiento_estimado_kg_ha: 8240,
              intervalo_inferior_kg_ha: 7100,
              intervalo_superior_kg_ha: 9380,
              confianza_porcentaje: 82.5,
              version_modelo: 'v1.0',
              generado_en: new Date().toISOString(),
            },
            error: null,
          },
        },
      }),
    });
  });
}

/** Intercepta las lecturas de sensores */
async function mockSensoresEndpoint(page: Page) {
  await page.route('**/trpc/sensores.ultimasLecturas**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            data: [
              {
                id: 'l1',
                valor: 27.3,
                registrado_en: new Date().toISOString(),
                es_anomalia: false,
                sensor: { tipo: 'temperatura', unidad: '°C' },
              },
              {
                id: 'l2',
                valor: 45.2,
                registrado_en: new Date().toISOString(),
                es_anomalia: false,
                sensor: { tipo: 'humedad_suelo', unidad: '%VWC' },
              },
            ],
            error: null,
          },
        },
      }),
    });
  });
}

/** Intercepta alertas */
async function mockAlertasEndpoint(page: Page) {
  await page.route('**/trpc/sensores.listarAlertas**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: { data: [], meta: { total: 0 }, error: null },
        },
      }),
    });
  });
}

/** Intercepta riego recomendación */
async function mockRiegoEndpoint(page: Page) {
  await page.route('**/trpc/riegos.calcularRecomendacion**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            data: {
              lamina_recomendada_mm: 12.5,
              et0_estimada: 4.2,
              etc_estimada: 5.0,
              deficit_hidrico: 35,
              precipitacion_efectiva: 0,
              justificacion: 'Condiciones normales.',
            },
            error: null,
          },
        },
      }),
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('AgriFlow — Dashboard principal', () => {
  test.beforeEach(async ({ page }) => {
    await mockPredictionEndpoint(page);
    await mockSensoresEndpoint(page);
    await mockAlertasEndpoint(page);
    await mockRiegoEndpoint(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('carga el dashboard correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/AgriFlow/i);
    await expect(page.getByText(/Lote Norte A/i)).toBeVisible();
    await expect(page.getByText(/Maíz Amarillo Duro/i)).toBeVisible();
  });

  test('muestra la sidebar con todos los ítems de navegación', async ({ page }) => {
    const navLinks = ['Dashboard', 'Predicciones', 'Riegos', 'Sensores', 'Reportes', 'Alertas'];
    for (const link of navLinks) {
      await expect(page.getByRole('link', { name: new RegExp(link, 'i') })).toBeVisible();
    }
  });

  test('muestra las 4 tarjetas de métricas', async ({ page }) => {
    await expect(page.getByTestId('metric-rendimiento')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Humedad del Suelo')).toBeVisible();
    await expect(page.getByText('Temperatura')).toBeVisible();
    await expect(page.getByText('Riego Recomendado')).toBeVisible();
  });

  test('muestra la tarjeta de predicción ML con datos', async ({ page }) => {
    const card = page.getByTestId('prediccion-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText(/8[.,]?240/)).toBeVisible();
    await expect(card.getByText(/82\.5%\s*confianza/i)).toBeVisible();
    await expect(card.getByText(/kg\s*\/\s*hectárea/i)).toBeVisible();
  });

  test('muestra el panel "Sin alertas activas"', async ({ page }) => {
    await expect(
      page.getByText(/Sin alertas activas/i),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('AgriFlow — Generación de Reporte PDF', () => {
  test('flujo completo: clic en Generar → toast de éxito', async ({ page }) => {
    await mockPredictionEndpoint(page);
    await mockSensoresEndpoint(page);
    await mockAlertasEndpoint(page);
    await mockRiegoEndpoint(page);

    // Interceptar la mutación de generar reporte
    await page.route('**/trpc/reportes.generar**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              data: {
                id: 'bbbbbbbb-0000-0000-0000-000000000001',
                estado: 'listo',
                tipo: 'operacional_semanal',
                generado_en: new Date().toISOString(),
              },
              error: null,
            },
          },
        }),
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const btnReporte = page.getByTestId('btn-generar-reporte');
    await expect(btnReporte).toBeVisible();
    await expect(btnReporte).toContainText(/Generar Reporte PDF/i);
    await btnReporte.click();

    // Verificar estado "Generando..."
    await expect(btnReporte).toContainText(/Generando/i, { timeout: 3_000 });

    // Verificar toast de éxito
    await expect(page.getByText(/Reporte generado/i)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('AgriFlow — Navegación entre páginas', () => {
  test.beforeEach(async ({ page }) => {
    await mockPredictionEndpoint(page);
    await mockSensoresEndpoint(page);
    await mockAlertasEndpoint(page);
    await mockRiegoEndpoint(page);
    await page.goto('/dashboard');
  });

  test('navega a Predicciones', async ({ page }) => {
    await page.getByRole('link', { name: /Predicciones/i }).click();
    await expect(page).toHaveURL(/\/predicciones/);
    await expect(page.getByText(/Predicciones de Rendimiento/i)).toBeVisible();
  });

  test('navega a Riegos', async ({ page }) => {
    await page.route('**/trpc/riegos.listarEventos**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { data: [], meta: { total: 0 } } } }),
      }),
    );
    await page.getByRole('link', { name: /Riegos/i }).click();
    await expect(page).toHaveURL(/\/riegos/);
    await expect(page.getByText(/Gestión de Riegos/i)).toBeVisible();
  });

  test('navega a Reportes', async ({ page }) => {
    await page.getByRole('link', { name: /Reportes/i }).click();
    await expect(page).toHaveURL(/\/reportes/);
    await expect(page.getByText(/Reportes PDF/i)).toBeVisible();
  });

  test('navega a Alertas', async ({ page }) => {
    await page.getByRole('link', { name: /Alertas/i }).click();
    await expect(page).toHaveURL(/\/alertas/);
    await expect(page.getByText(/Gestión de Alertas/i)).toBeVisible();
  });

  test('vuelve al dashboard desde otra página', async ({ page }) => {
    await page.goto('/predicciones');
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('AgriFlow — Página de Riegos', () => {
  test('muestra la recomendación FAO-56 con datos mock', async ({ page }) => {
    await mockRiegoEndpoint(page);
    await page.route('**/trpc/riegos.listarEventos**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { data: [], meta: { total: 0 } } } }),
      }),
    );

    await page.goto('/riegos');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('12.5')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/mm de riego recomendado/i)).toBeVisible();
  });
});
