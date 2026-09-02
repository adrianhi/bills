import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthScreen, useAuthSession } from '@/features/auth';
import { BankOnboarding } from '@/features/onboarding';
import { LegalAcceptanceScreen, LegalDocumentPage } from '@/features/legal';
import { LoadingScreen } from '@/shared/ui';

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard');
  return { default: module.DashboardPage };
});

export function App() {
  // Authentication & Session
  const {
    authToken,
    checkingSession,
    setupError,
    onboardingComplete,
    setOnboardingComplete,
    legalAcceptanceRequired,
    setLegalAcceptanceRequired,
    productGuide,
    setProductGuide,
    handleLock,
  } = useAuthSession();

  if (checkingSession) {
    return (
      <LoadingScreen
        message="Iniciando Bills…"
        description="Validando tus credenciales seguras…"
      />
    );
  }

  let protectedContent;
  if (!authToken) {
    protectedContent = <AuthScreen checkingSession={checkingSession} setupError={setupError} />;
  } else if (legalAcceptanceRequired) {
    protectedContent = (
      <LegalAcceptanceScreen
        authToken={authToken}
        onAccepted={() => setLegalAcceptanceRequired(false)}
        onLogout={() => void handleLock()}
      />
    );
  } else if (!onboardingComplete) {
    protectedContent = (
      <BankOnboarding
        authToken={authToken}
        onComplete={() => setOnboardingComplete(true)}
        onLogout={() => void handleLock()}
      />
    );
  } else {
    protectedContent = (
      <Suspense
        fallback={
          <LoadingScreen
            message="Cargando Bills…"
            description="Preparando tu dashboard y herramientas…"
          />
        }
      >
        <DashboardPage
          authToken={authToken}
          productGuide={productGuide}
          onProductGuideChange={setProductGuide}
          onLock={() => void handleLock()}
          onAccountDeleted={() => void handleLock()}
        />
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route path="/legal/:slug" element={<LegalDocumentPage />} />
      <Route path="/terms" element={<LegalDocumentPage path="/legal/terms" />} />
      <Route path="/privacy" element={<LegalDocumentPage path="/legal/privacy" />} />
      <Route path="*" element={protectedContent} />
    </Routes>
  );
}

export default App;
