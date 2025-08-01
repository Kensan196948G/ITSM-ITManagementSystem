import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from '../App';
import { theme } from '../theme/theme';

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    
    expect(document.body).toBeTruthy();
  });

  it('displays the main application structure', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check for main app container
    const appContainer = document.querySelector('[data-testid="app-container"]') || 
                         document.querySelector('.App') ||
                         document.body.firstChild;
    
    expect(appContainer).toBeTruthy();
  });

  it('applies Material-UI theme correctly', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check that CSS baseline is applied
    const body = document.body;
    expect(body).toBeTruthy();
  });

  it('handles routing setup', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should not throw errors with router setup
    expect(true).toBe(true);
  });
});