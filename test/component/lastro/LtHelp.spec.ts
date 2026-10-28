import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { LtHelp } from '@/lastro';

const renderHelp = () => render(LtHelp, { props: { title: 'Spread', text: 'A diferença entre a melhor venda e a melhor compra.' } });

describe('Help bubble', () => {
  test('Should explain the term on hover and describe the button while open', async () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: 'O que é Spread?' });

    await fireEvent.mouseEnter(trigger.parentElement as HTMLElement);

    expect(screen.getByRole('tooltip').textContent).toContain('A diferença entre a melhor venda e a melhor compra.');
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
  });

  test('Should open on keyboard focus and close on Escape', async () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: 'O que é Spread?' });

    await fireEvent.focus(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeNull();
    await fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  test('Should stay open after a tap until a tap elsewhere', async () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: 'O que é Spread?' });

    await fireEvent.click(trigger);
    await fireEvent.mouseLeave(trigger.parentElement as HTMLElement);
    expect(screen.queryByRole('tooltip')).not.toBeNull();
    await fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
