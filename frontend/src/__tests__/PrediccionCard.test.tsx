import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrediccionCard } from '@/components/dashboard/PrediccionCard';

const mockPrediccion = {
  rendimiento_estimado_kg_ha: 8240,
  intervalo_inferior_kg_ha: 7100,
  intervalo_superior_kg_ha: 9380,
  confianza_porcentaje: 82.5,
  version_modelo: 'v1.0',
  generado_en: new Date('2025-04-30T10:00:00').toISOString(),
};

describe('PrediccionCard', () => {
  it('renderiza el valor de rendimiento estimado', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    // Número formateado con separador de miles en español (8.240 o 8,240)
    expect(screen.getByText(/8[.,]240/)).toBeInTheDocument();
  });

  it('muestra el porcentaje de confianza correctamente', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    expect(screen.getByText(/82\.5%\s*confianza/i)).toBeInTheDocument();
  });

  it('muestra los límites del intervalo de confianza', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    expect(screen.getByText(/7[.,]100/)).toBeInTheDocument();
    expect(screen.getByText(/9[.,]380/)).toBeInTheDocument();
  });

  it('muestra la versión del modelo', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('aplica data-testid cuando se provee', () => {
    render(<PrediccionCard prediccion={mockPrediccion} data-testid="mi-prediccion" />);
    expect(screen.getByTestId('mi-prediccion')).toBeInTheDocument();
  });

  it('muestra la etiqueta de la unidad "kg / hectárea"', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    expect(screen.getByText(/kg\s*\/\s*hectárea/i)).toBeInTheDocument();
  });

  it('muestra la información de "Ensemble Stacking"', () => {
    render(<PrediccionCard prediccion={mockPrediccion} />);
    expect(screen.getByText(/Ensemble Stacking/i)).toBeInTheDocument();
  });

  it('renderiza el indicador de confianza alta en verde para > 80%', () => {
    render(<PrediccionCard prediccion={mockPrediccion} data-testid="card" />);
    const badge = screen.getByText(/82\.5%\s*confianza/i);
    // Debe tener clases de color emerald (confianza alta)
    expect(badge.className).toMatch(/emerald/);
  });

  it('renderiza confianza baja en rojo para < 65%', () => {
    const lowConf = { ...mockPrediccion, confianza_porcentaje: 55 };
    render(<PrediccionCard prediccion={lowConf} />);
    const badge = screen.getByText(/55\.0%\s*confianza/i);
    expect(badge.className).toMatch(/red/);
  });
});
