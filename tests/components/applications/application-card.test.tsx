/**
 * ApplicationCard Component Tests
 *
 * Tests for the GC overdue indicator and inline rejection button
 * added to the pipeline card.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplicationCard, type ApplicationCardData } from '@/components/applications/application-card';

// Minimal mocks for shadcn/ui primitives used by the card
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div className={className} onClick={onClick} data-testid="card">{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock('@/components/applications/status-badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

function makeApplication(overrides: Partial<ApplicationCardData> = {}): ApplicationCardData {
  return {
    id: 'app-123',
    position: 'Programme Associate',
    currentStage: 'GENERAL_COMPETENCIES',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    person: {
      id: 'person-123',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      generalCompetenciesCompleted: false,
      generalCompetenciesScore: null,
    },
    needsAttention: false,
    isGcOverdue: false,
    ...overrides,
  };
}

describe('ApplicationCard', () => {
  const onView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GC overdue indicator (border colour)', () => {
    it('renders red border class when isGcOverdue is true', () => {
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: true })}
          onView={onView}
        />
      );
      const card = screen.getByTestId('card');
      expect(card.className).toContain('border-l-red-500');
      expect(card.className).not.toContain('border-l-amber-500');
    });

    it('renders amber border class when needsAttention is true but not overdue', () => {
      render(
        <ApplicationCard
          application={makeApplication({ needsAttention: true, isGcOverdue: false })}
          onView={onView}
        />
      );
      const card = screen.getByTestId('card');
      expect(card.className).toContain('border-l-amber-500');
      expect(card.className).not.toContain('border-l-red-500');
    });

    it('red border takes precedence over amber when both flags are true', () => {
      render(
        <ApplicationCard
          application={makeApplication({ needsAttention: true, isGcOverdue: true })}
          onView={onView}
        />
      );
      const card = screen.getByTestId('card');
      expect(card.className).toContain('border-l-red-500');
      expect(card.className).not.toContain('border-l-amber-500');
    });

    it('renders no left border class when neither flag is set', () => {
      render(
        <ApplicationCard
          application={makeApplication({ needsAttention: false, isGcOverdue: false })}
          onView={onView}
        />
      );
      const card = screen.getByTestId('card');
      expect(card.className).not.toContain('border-l-red-500');
      expect(card.className).not.toContain('border-l-amber-500');
    });
  });

  describe('Inline GC rejection button', () => {
    it('renders XCircle reject button when isGcOverdue, isAdmin, and callback are provided', () => {
      const onRejectGcOverdue = jest.fn();
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: true })}
          onView={onView}
          onRejectGcOverdue={onRejectGcOverdue}
          isAdmin={true}
        />
      );
      expect(screen.getByRole('button', { name: /reject inactive application/i })).toBeInTheDocument();
    });

    it('does not render reject button when isAdmin is false', () => {
      const onRejectGcOverdue = jest.fn();
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: true })}
          onView={onView}
          onRejectGcOverdue={onRejectGcOverdue}
          isAdmin={false}
        />
      );
      expect(screen.queryByRole('button', { name: /reject inactive application/i })).not.toBeInTheDocument();
    });

    it('does not render reject button when isGcOverdue is false', () => {
      const onRejectGcOverdue = jest.fn();
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: false })}
          onView={onView}
          onRejectGcOverdue={onRejectGcOverdue}
          isAdmin={true}
        />
      );
      const tooltipContents = screen.queryAllByTestId('tooltip-content');
      const rejectTooltip = tooltipContents.find(el => el.textContent?.includes('GC assessment overdue'));
      expect(rejectTooltip).toBeFalsy();
    });

    it('does not render reject button when callback is not provided', () => {
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: true })}
          onView={onView}
          isAdmin={true}
          // onRejectGcOverdue not provided
        />
      );
      expect(screen.queryByRole('button', { name: /reject inactive application/i })).not.toBeInTheDocument();
    });

    it('calls onRejectGcOverdue with the application ID when clicked', () => {
      const onRejectGcOverdue = jest.fn();
      render(
        <ApplicationCard
          application={makeApplication({ isGcOverdue: true })}
          onView={onView}
          onRejectGcOverdue={onRejectGcOverdue}
          isAdmin={true}
        />
      );
      // Find the reject button by its destructive styling
      const buttons = screen.getAllByRole('button');
      // The reject button is the one before the view-details button
      // We look for a button with a click handler that calls onRejectGcOverdue
      // Fire a click on each button until onRejectGcOverdue is called
      buttons.forEach(btn => fireEvent.click(btn));
      expect(onRejectGcOverdue).toHaveBeenCalledWith('app-123');
    });
  });
});
