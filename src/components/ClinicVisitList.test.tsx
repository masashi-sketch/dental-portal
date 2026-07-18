import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClinicVisitList from './ClinicVisitList';
import type { ClinicVisit } from '@/lib/supabase/types';

function makeVisit(overrides: Partial<ClinicVisit> = {}): ClinicVisit {
  return {
    id: 'v1',
    customer_code: 'A000001',
    visit_date: '2026-07-01',
    purpose: '定期訪問',
    memo: '新商品のご案内をした',
    next_visit_date: '2026-08-01',
    created_by: null,
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('ClinicVisitList', () => {
  it('0件のときは空メッセージを表示する', () => {
    render(<ClinicVisitList visits={[]} />);
    expect(screen.getByText('訪問記録はまだありません')).toBeInTheDocument();
  });

  it('訪問日・目的・メモ・次回予定を表示する', () => {
    render(<ClinicVisitList visits={[makeVisit()]} />);
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('定期訪問')).toBeInTheDocument();
    expect(screen.getByText('新商品のご案内をした')).toBeInTheDocument();
    expect(screen.getByText('次回予定：2026-08-01')).toBeInTheDocument();
  });

  it('メモ・次回予定がnullの行では該当表示を出さない', () => {
    render(<ClinicVisitList visits={[makeVisit({ memo: null, next_visit_date: null })]} />);
    expect(screen.getByText('定期訪問')).toBeInTheDocument();
    expect(screen.queryByText(/次回予定：/)).not.toBeInTheDocument();
  });

  it('複数件を全て表示する', () => {
    render(
      <ClinicVisitList
        visits={[makeVisit(), makeVisit({ id: 'v2', purpose: '新規提案', visit_date: '2026-06-15' })]}
      />,
    );
    expect(screen.getByText('定期訪問')).toBeInTheDocument();
    expect(screen.getByText('新規提案')).toBeInTheDocument();
  });
});
