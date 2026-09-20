import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LetterBoard } from './LetterBoard';

describe('LetterBoard', () => {
  it('añade letras a la respuesta en el orden en que se tocan', () => {
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'S' }));

    expect(screen.getByLabelText('Tu palabra')).toHaveTextContent('CAS');
  });

  it('desactiva la ficha usada y la reactiva al quitarla de la respuesta', () => {
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={vi.fn()} />);
    const tile = screen.getByRole('button', { name: 'C' });

    fireEvent.click(tile);
    expect(tile).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Quitar C' }));
    expect(tile).not.toBeDisabled();
  });

  it('quitar una ficha del medio de la respuesta no afecta a las demás', () => {
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'S' }));

    fireEvent.click(screen.getByRole('button', { name: 'Quitar A' }));

    expect(screen.getByLabelText('Tu palabra')).toHaveTextContent('CS');
    expect(screen.getByRole('button', { name: 'A' })).not.toBeDisabled();
  });

  it('trata cada aparición de una letra repetida como una ficha independiente', () => {
    render(<LetterBoard letters={['S', 'A', 'S', 'A', 'S']} onSubmit={vi.fn()} />);
    const sTiles = screen.getAllByRole('button', { name: 'S' });
    expect(sTiles).toHaveLength(3);

    fireEvent.click(sTiles[0]!);
    expect(sTiles[0]).toBeDisabled();
    expect(sTiles[1]).not.toBeDisabled();
    expect(sTiles[2]).not.toBeDisabled();
  });

  it('el botón Enviar está deshabilitado sin letras seleccionadas', () => {
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('envía la palabra formada y reinicia la selección', () => {
    const onSubmit = vi.fn();
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onSubmit).toHaveBeenCalledWith('CAS');
    expect(screen.getByText('Toca las letras para formar tu palabra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C' })).not.toBeDisabled();
  });

  it('"Borrar todo" limpia la selección y reactiva todas las fichas', () => {
    render(<LetterBoard letters={['C', 'A', 'S', 'T', 'O']} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar todo' }));

    expect(screen.getByText('Toca las letras para formar tu palabra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C' })).not.toBeDisabled();
  });
});
