import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from '@/components/dashboard/MetricCard';

describe('MetricCard', () => {
  it('renderiza título y valor', () => {
    render(
      <MetricCard titulo="Rendimiento" valor="8.240 kg/ha" icono="🌾" />,
    );
    expect(screen.getByText('Rendimiento')).toBeInTheDocument();
    expect(screen.getByText('8.240 kg/ha')).toBeInTheDocument();
  });

  it('muestra subtítulo cuando se provee', () => {
    render(
      <MetricCard titulo="Test" valor="42" icono="📊" subtitulo="Últimas 24h" />,
    );
    expect(screen.getByText('Últimas 24h')).toBeInTheDocument();
  });

  it('muestra skeleton de carga cuando cargando=true', () => {
    render(
      <MetricCard titulo="Test" valor="—" icono="📊" cargando={true} />,
    );
    // El valor NO debe mostrarse cuando está cargando
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('no muestra flecha en tendencia neutral', () => {
    render(
      <MetricCard titulo="Test" valor="100" icono="📊" tendencia="neutral" />,
    );
    expect(screen.queryByText('↑')).not.toBeInTheDocument();
    expect(screen.queryByText('↓')).not.toBeInTheDocument();
  });

  it('muestra flecha ↑ para tendencia up', () => {
    render(<MetricCard titulo="Test" valor="100" icono="📊" tendencia="up" />);
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('muestra flecha ↓ para tendencia down', () => {
    render(<MetricCard titulo="Test" valor="2" icono="⚠️" tendencia="down" />);
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('aplica testId al elemento contenedor', () => {
    render(<MetricCard titulo="T" valor="V" icono="🔥" testId="mi-card" />);
    expect(screen.getByTestId('mi-card')).toBeInTheDocument();
  });
});
