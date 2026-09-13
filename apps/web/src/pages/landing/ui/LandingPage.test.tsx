import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('renders landing page markup with headline and waitlist call to action', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LandingPage hasSession={false} />
      </MemoryRouter>
    );

    expect(html).toContain('sin dañar tu quincena');
    expect(html).toContain('tu.correo@ejemplo.com');
    expect(html).toContain('Solicitar acceso');
    expect(html).toContain('Ya tengo invitación');
  });

  it('shows dashboard button when user already has active session', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LandingPage hasSession={true} />
      </MemoryRouter>
    );

    expect(html).toContain('Ir a mi panel');
  });
});
