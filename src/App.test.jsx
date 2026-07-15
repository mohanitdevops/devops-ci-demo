import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App, { add } from './App.jsx';

describe('add()', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});

describe('App', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(screen.getByText('DevOps CI/CD Demo')).toBeInTheDocument();
  });

  it('increments the click counter', () => {
    render(<App />);
    const button = screen.getByText(/Clicks: 0/);
    fireEvent.click(button);
    expect(screen.getByText(/Clicks: 1/)).toBeInTheDocument();
  });
});
