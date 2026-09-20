import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./dictionary', () => ({
  loadDictionary: () => Promise.resolve(0),
}));

import App from './App';

describe('App shell', () => {
  it('muestra la pantalla de inicio con los dos modos una vez cargado el diccionario', async () => {
    render(<App />);
    expect(await screen.findByText('Duelo Léxico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jugar en local/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jugar online/i })).toBeInTheDocument();
  });

  it('muestra un estado de carga antes de que el diccionario este listo', () => {
    render(<App />);
    expect(screen.getByText(/cargando diccionario/i)).toBeInTheDocument();
  });
});
