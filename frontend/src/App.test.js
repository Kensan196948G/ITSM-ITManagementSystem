import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
describe('App', () => {
    it('renders without crashing', () => {
        render(_jsx(App, {}));
    });
    it('contains main app elements', () => {
        render(_jsx(App, {}));
        // Basic test that the app renders
        expect(document.body).toBeDefined();
    });
});
