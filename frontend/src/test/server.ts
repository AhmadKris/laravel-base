import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Every page reads the branding and public settings, so tests that do not care get the defaults.
export const server = setupServer(
    http.get('*/api/v1/system-configurations/public', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: { 'company.name': 'Enterprise System' },
            meta: null,
        }),
    ),
    http.get('*/api/v1/branding', () =>
        HttpResponse.json({
            success: true,
            message: '',
            data: {
                logo: null,
                logo_dark: null,
                favicon: null,
                display: { show_name: true, background: 'transparent', size: 'medium' },
            },
            meta: null,
        }),
    ),
);
