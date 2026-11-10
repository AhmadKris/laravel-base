import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Every page reads the branding, so tests that do not care about it get the default look.
export const server = setupServer(
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
