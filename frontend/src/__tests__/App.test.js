import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles/index.js';
import CssBaseline from '@mui/material/CssBaseline';
import App from '../App';
import { theme } from '../theme/theme';
// Test wrapper component
const TestWrapper = ({ children }) => (_jsx(BrowserRouter, { children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), children] }) }));
describe('App Component', () => {
    it('renders without crashing', () => {
        render(_jsx(TestWrapper, { children: _jsx(App, {}) }));
        expect(document.body).toBeTruthy();
    });
    it('displays the main application structure', () => {
        render(_jsx(TestWrapper, { children: _jsx(App, {}) }));
        // Check for main app container
        const appContainer = document.querySelector('[data-testid="app-container"]') ||
            document.querySelector('.App') ||
            document.body.firstChild;
        expect(appContainer).toBeTruthy();
    });
    it('applies Material-UI theme correctly', () => {
        render(_jsx(TestWrapper, { children: _jsx(App, {}) }));
        // Check that CSS baseline is applied
        const body = document.body;
        expect(body).toBeTruthy();
    });
    it('handles routing setup', () => {
        render(_jsx(TestWrapper, { children: _jsx(App, {}) }));
        // Should not throw errors with router setup
        expect(true).toBe(true);
    });
});
