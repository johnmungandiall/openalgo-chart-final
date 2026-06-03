import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeToggle from '../components/Topbar/components/ModeToggle';
import * as modeService from '../services/mockDataService';

vi.mock('../services/mockDataService', () => ({
  isDemoMode: vi.fn(),
  setDemoMode: vi.fn(),
}));

const isDemoMode = modeService.isDemoMode as unknown as ReturnType<typeof vi.fn>;
const setDemoMode = modeService.setDemoMode as unknown as ReturnType<typeof vi.fn>;

describe('ModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks LIVE active when not in demo mode', () => {
    isDemoMode.mockReturnValue(false);
    render(<ModeToggle />);
    expect(screen.getByRole('button', { name: 'LIVE' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'DEMO' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks DEMO active when in demo mode', () => {
    isDemoMode.mockReturnValue(true);
    render(<ModeToggle />);
    expect(screen.getByRole('button', { name: 'DEMO' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to DEMO when the inactive segment is clicked and confirmed', () => {
    isDemoMode.mockReturnValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'DEMO' }));
    expect(setDemoMode).toHaveBeenCalledWith(true);
  });

  it('does NOT switch when confirm is cancelled', () => {
    isDemoMode.mockReturnValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'DEMO' }));
    expect(setDemoMode).not.toHaveBeenCalled();
  });

  it('clicking the already-active segment is a no-op', () => {
    isDemoMode.mockReturnValue(false);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'LIVE' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(setDemoMode).not.toHaveBeenCalled();
  });
});
