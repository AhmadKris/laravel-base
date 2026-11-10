import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CenteredPage } from './CenteredPage';

it('defaults to max-w-2xl and supports the wide layout', () => {
    const { container, rerender } = render(<CenteredPage>Konten</CenteredPage>);

    expect(container.querySelector('section')).toHaveClass('max-w-2xl');

    rerender(<CenteredPage width="wide">Konten lebar</CenteredPage>);

    expect(container.querySelector('section')).toHaveClass('max-w-5xl');
});
