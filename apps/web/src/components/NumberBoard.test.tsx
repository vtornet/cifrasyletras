import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberBoard } from './NumberBoard';

describe('NumberBoard', () => {
  it('calcula y apila un paso al tocar número, operador y número', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));

    expect(screen.getByLabelText('Tus operaciones')).toHaveTextContent('24 × 10 = 240');
  });

  it('encadena un segundo paso usando el resultado del primero', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));

    // el resultado (240) aparece ahora como ficha disponible
    fireEvent.click(screen.getByRole('button', { name: '240' }));
    fireEvent.click(screen.getByRole('button', { name: '−' }));
    fireEvent.click(screen.getByRole('button', { name: '30' }));

    const answer = screen.getByLabelText('Tus operaciones');
    expect(answer).toHaveTextContent('24 × 10 = 240');
    expect(answer).toHaveTextContent('240 − 30 = 210');
  });

  it('tocar la ficha elegida como primer operando la deselecciona', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    const tile24 = screen.getByRole('button', { name: '24' });

    fireEvent.click(tile24);
    expect(screen.getByLabelText('Tus operaciones')).toHaveTextContent('24');

    fireEvent.click(tile24); // deseleccionar
    expect(screen.getByLabelText('Tus operaciones')).not.toHaveTextContent('24');
    expect(screen.getByRole('button', { name: '10' })).not.toBeDisabled();
  });

  it('deshabilita las demas fichas hasta elegir un operador, pero no los operadores', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));

    expect(screen.getByRole('button', { name: '10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '30' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '×' })).not.toBeDisabled();
  });

  it('rechaza un paso cuyo resultado no es entero positivo y dejar corregir', () => {
    render(<NumberBoard numbers={[3, 10, 30]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '÷' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/no da un resultado entero positivo/i);
    // no se ha apilado ningun paso y las fichas originales siguen disponibles
    expect(screen.getByRole('button', { name: '10' })).not.toBeDisabled();
  });

  it('"Deshacer último paso" devuelve sus dos números al tablero', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer último paso' }));

    expect(screen.getByLabelText('Tus operaciones')).not.toHaveTextContent('240');
    expect(screen.getByRole('button', { name: '24' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '240' })).not.toBeInTheDocument();
  });

  it('permite enviar un único número sin ninguna operación', () => {
    const onSubmit = vi.fn();
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onSubmit).toHaveBeenCalledWith('24');
  });

  it('envía la cadena de pasos en el formato "left op right;..." y reinicia el tablero', () => {
    const onSubmit = vi.fn();
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '24' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '10' }));
    fireEvent.click(screen.getByRole('button', { name: '240' }));
    fireEvent.click(screen.getByRole('button', { name: '−' }));
    fireEvent.click(screen.getByRole('button', { name: '30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onSubmit).toHaveBeenCalledWith('24*10;240-30');
    expect(screen.getByRole('button', { name: '24' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('el botón Enviar está deshabilitado sin ninguna selección', () => {
    render(<NumberBoard numbers={[24, 10, 30]} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});
