import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui';
import { useAccountSettings } from '../model/useAccountSettings';
import { AccountConnectionsSection } from './AccountConnectionsSection';
import { AccountPrivacySections } from './AccountPrivacySections';

interface AccountSettingsModalProps {
  authToken: string;
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export function AccountSettingsModal({
  authToken,
  isOpen,
  onClose,
  onAccountDeleted,
}: AccountSettingsModalProps) {
  const model = useAccountSettings(isOpen, Boolean(authToken), onAccountDeleted);
  const mustSelectBanks = model.connections.some(
    (connection) => connection.status === 'ACTIVE' && connection.requiresBankSelection
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !mustSelectBanks && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Privacidad y conexiones</DialogTitle>
          <DialogDescription>
            {mustSelectBanks
              ? 'Selecciona al menos un banco para reanudar Gmail.'
              : 'Controla las fuentes conectadas y tus derechos sobre los datos.'}
          </DialogDescription>
        </DialogHeader>
        <AccountConnectionsSection model={model} />
        <AccountPrivacySections model={model} />
      </DialogContent>
    </Dialog>
  );
}
