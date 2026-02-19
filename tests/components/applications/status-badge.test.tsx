/**
 * StatusBadge Component Tests
 *
 * Tests for the status badge component that displays application status.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/applications/status-badge';

// Define Status enum locally to avoid import issues
const Status = {
  ACTIVE: 'ACTIVE' as const,
  ACCEPTED: 'ACCEPTED' as const,
  REJECTED: 'REJECTED' as const,
  WITHDRAWN: 'WITHDRAWN' as const,
};

type StatusType = (typeof Status)[keyof typeof Status];

describe('StatusBadge', () => {
  describe('StatusBadge component', () => {
    it('should render ACTIVE status with correct label', () => {
      render(<StatusBadge status={Status.ACTIVE} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render ACCEPTED status with correct label', () => {
      render(<StatusBadge status={Status.ACCEPTED} />);
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('should render REJECTED status with correct label', () => {
      render(<StatusBadge status={Status.REJECTED} />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('should render WITHDRAWN status with correct label', () => {
      render(<StatusBadge status={Status.WITHDRAWN} />);
      expect(screen.getByText('Withdrawn')).toBeInTheDocument();
    });

    it('should render all statuses without error', () => {
      const statuses: StatusType[] = [Status.ACTIVE, Status.ACCEPTED, Status.REJECTED, Status.WITHDRAWN];
      const labels = ['Active', 'Accepted', 'Rejected', 'Withdrawn'];

      statuses.forEach((status, index) => {
        const { unmount } = render(<StatusBadge status={status} />);
        expect(screen.getByText(labels[index])).toBeInTheDocument();
        unmount();
      });
    });

    it('should apply custom className', () => {
      render(<StatusBadge status={Status.ACTIVE} className="custom-class" />);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('custom-class');
    });

    it('should render sm size variant', () => {
      render(<StatusBadge status={Status.ACTIVE} size="sm" />);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('text-xs');
    });
  });
});
