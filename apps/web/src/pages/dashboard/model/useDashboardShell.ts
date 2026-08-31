import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProductGuideState } from '@bills/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { connectionService } from '@/entities/connection';
import { APP_SECTIONS, type AppSection } from '@/widgets/bottom-nav';

export const DASHBOARD_SECTION_TITLES: Record<AppSection, string> = {
  home: 'Inicio',
  transactions: 'Movimientos',
  analytics: 'Analítica',
  more: 'Más',
};

function sectionFromPath(pathname: string): AppSection | null {
  if (pathname.includes('/movimientos')) return 'transactions';
  if (pathname.includes('/analitica')) return 'analytics';
  if (pathname.includes('/mas')) return 'more';
  if (pathname.includes('/inicio')) return 'home';
  return null;
}

export function useDashboardShell(productGuide: ProductGuideState) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = sectionFromPath(location.pathname) ?? 'home';
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => new URLSearchParams(window.location.search).get('settings') === 'connections'
  );
  const [isTourInviteOpen, setIsTourInviteOpen] = useState(
    () => productGuide.versionSeen !== productGuide.currentVersion
  );
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const connectionsQuery = useQuery({
    queryKey: ['inbox-connections', 'dashboard'],
    queryFn: ({ signal }) => connectionService.listInboxConnections(signal),
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some(
        (connection) =>
          connection.currentJob?.status === 'PENDING' ||
          connection.currentJob?.status === 'PROCESSING'
      )
        ? 2_500
        : false,
  });

  useEffect(() => {
    if (!sectionFromPath(location.pathname)) {
      navigate('/app/inicio', { replace: true });
    }
  }, [location.pathname, navigate]);

  const selectSection = (
    section: AppSection,
    replace = false,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const target = APP_SECTIONS.find((item) => item.id === section);
    if (target) navigate(target.path, { replace });
    window.scrollTo({ top: 0, behavior });
  };

  return {
    activeSection,
    selectSection,
    connectionsQuery,
    primaryConnection:
      connectionsQuery.data?.find((connection) => connection.status !== 'REVOKED') ??
      connectionsQuery.data?.[0],
    requiresBankSelection:
      connectionsQuery.data?.some(
        (connection) => connection.status === 'ACTIVE' && connection.requiresBankSelection
      ) ?? false,
    isSettingsOpen,
    setIsSettingsOpen,
    isTourInviteOpen,
    setIsTourInviteOpen,
    isTourOpen,
    setIsTourOpen,
    isExportModalOpen,
    setIsExportModalOpen,
  };
}
