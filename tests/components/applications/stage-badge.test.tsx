/**
 * StageBadge Component Tests
 *
 * Tests for the stage badge component that displays application pipeline stage.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StageBadge, getStageName, getStageOrder } from '@/components/applications/stage-badge';

// Define Stage enum locally to avoid import issues
const Stage = {
  APPLICATION: 'APPLICATION' as const,
  GENERAL_COMPETENCIES: 'GENERAL_COMPETENCIES' as const,
  SPECIALIZED_COMPETENCIES: 'SPECIALIZED_COMPETENCIES' as const,
  INTERVIEW: 'INTERVIEW' as const,
  AGREEMENT: 'AGREEMENT' as const,
  SIGNED: 'SIGNED' as const,
};

type StageType = (typeof Stage)[keyof typeof Stage];

describe('StageBadge', () => {
  describe('getStageName', () => {
    it('should return correct name for APPLICATION stage', () => {
      expect(getStageName(Stage.APPLICATION)).toBe('Application');
    });

    it('should return correct name for GENERAL_COMPETENCIES stage', () => {
      expect(getStageName(Stage.GENERAL_COMPETENCIES)).toBe('General Competencies');
    });

    it('should return correct name for SPECIALIZED_COMPETENCIES stage', () => {
      expect(getStageName(Stage.SPECIALIZED_COMPETENCIES)).toBe('Specialised Competencies');
    });

    it('should return correct name for INTERVIEW stage', () => {
      expect(getStageName(Stage.INTERVIEW)).toBe('Interview');
    });

    it('should return correct name for AGREEMENT stage', () => {
      expect(getStageName(Stage.AGREEMENT)).toBe('Agreement');
    });

    it('should return correct name for SIGNED stage', () => {
      expect(getStageName(Stage.SIGNED)).toBe('Signed');
    });
  });

  describe('getStageOrder', () => {
    it('should return correct order for all stages', () => {
      expect(getStageOrder(Stage.APPLICATION)).toBe(1);
      expect(getStageOrder(Stage.GENERAL_COMPETENCIES)).toBe(2);
      expect(getStageOrder(Stage.SPECIALIZED_COMPETENCIES)).toBe(3);
      expect(getStageOrder(Stage.INTERVIEW)).toBe(4);
      expect(getStageOrder(Stage.AGREEMENT)).toBe(5);
      expect(getStageOrder(Stage.SIGNED)).toBe(6);
    });
  });

  describe('StageBadge component', () => {
    it('should render APPLICATION stage with correct label', () => {
      render(<StageBadge stage={Stage.APPLICATION} />);
      expect(screen.getByText('Application')).toBeInTheDocument();
    });

    it('should render INTERVIEW stage with correct label', () => {
      render(<StageBadge stage={Stage.INTERVIEW} />);
      expect(screen.getByText('Interview')).toBeInTheDocument();
    });

    it('should render all stages correctly', () => {
      const stages: StageType[] = [
        Stage.APPLICATION,
        Stage.GENERAL_COMPETENCIES,
        Stage.SPECIALIZED_COMPETENCIES,
        Stage.INTERVIEW,
        Stage.AGREEMENT,
        Stage.SIGNED,
      ];
      stages.forEach((stage) => {
        const { unmount } = render(<StageBadge stage={stage} />);
        const name = getStageName(stage);
        expect(screen.getByText(name)).toBeInTheDocument();
        unmount();
      });
    });

    it('should apply custom className', () => {
      render(<StageBadge stage={Stage.INTERVIEW} className="custom-class" />);
      const badge = screen.getByText('Interview');
      expect(badge).toHaveClass('custom-class');
    });

    it('should render sm size variant', () => {
      render(<StageBadge stage={Stage.APPLICATION} size="sm" />);
      const badge = screen.getByText('Application');
      expect(badge).toHaveClass('text-xs');
    });

    it('should show stage number when showNumber is true', () => {
      render(<StageBadge stage={Stage.INTERVIEW} showNumber />);
      // Stage 4 (Interview) should have "4." before the label
      expect(screen.getByText('4.')).toBeInTheDocument();
      expect(screen.getByText('Interview')).toBeInTheDocument();
    });

    it('should not show stage number by default', () => {
      render(<StageBadge stage={Stage.APPLICATION} />);
      expect(screen.queryByText('1.')).not.toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });
  });
});
