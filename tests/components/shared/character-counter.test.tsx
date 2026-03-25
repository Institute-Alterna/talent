/**
 * CharacterCounter Component Tests
 *
 * Tests for the premium character counter that fades in as users
 * approach the character limit, cycling through colour states.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CharacterCounter } from '@/components/shared/character-counter';

describe('CharacterCounter', () => {
  const MAX = 100;

  const text = (n: number) => `${n} / ${MAX}`;

  it('is not visible when value is well below the threshold', () => {
    render(<CharacterCounter value={'a'.repeat(50)} maxLength={MAX} />);
    expect(screen.getByText(text(50)).closest('div')).toHaveClass('opacity-0');
  });

  it('becomes visible when value reaches the default 80% threshold', () => {
    render(<CharacterCounter value={'a'.repeat(80)} maxLength={MAX} />);
    expect(screen.getByText(text(80)).closest('div')).toHaveClass('opacity-100');
  });

  it('shows muted styling between 80% and 95%', () => {
    render(<CharacterCounter value={'a'.repeat(80)} maxLength={MAX} />);
    const span = screen.getByText(text(80));
    expect(span).toHaveClass('text-muted-foreground');
    expect(span).not.toHaveClass('text-destructive');
  });

  it('shows warning (amber) styling between 95% and 100%', () => {
    render(<CharacterCounter value={'a'.repeat(97)} maxLength={MAX} />);
    const span = screen.getByText(text(97));
    expect(span).toHaveClass('text-amber-500');
    expect(span).not.toHaveClass('text-destructive');
  });

  it('shows destructive styling when over the limit', () => {
    render(<CharacterCounter value={'a'.repeat(105)} maxLength={MAX} />);
    const span = screen.getByText(text(105));
    expect(span).toHaveClass('text-destructive');
    expect(span).not.toHaveClass('text-amber-500');
  });

  it('shows font-medium weight when over the limit', () => {
    render(<CharacterCounter value={'a'.repeat(101)} maxLength={MAX} />);
    expect(screen.getByText(text(101))).toHaveClass('font-medium');
  });

  it('displays exactly at the limit without destructive styling', () => {
    render(<CharacterCounter value={'a'.repeat(100)} maxLength={MAX} />);
    expect(screen.getByText(text(100))).not.toHaveClass('text-destructive');
  });

  it('respects a custom showThreshold', () => {
    // 60% fill with a threshold of 0.5 → should be visible
    render(
      <CharacterCounter value={'a'.repeat(60)} maxLength={MAX} showThreshold={0.5} />
    );
    expect(screen.getByText(text(60)).closest('div')).toHaveClass('opacity-100');
  });

  it('formats the count correctly as "{current} / {max}"', () => {
    render(<CharacterCounter value={'a'.repeat(85)} maxLength={MAX} />);
    expect(screen.getByText(text(85))).toBeInTheDocument();
  });

  it('shows 0 / max when value is empty string', () => {
    render(<CharacterCounter value={''} maxLength={MAX} showThreshold={0} />);
    expect(screen.getByText(text(0))).toBeInTheDocument();
  });
});
