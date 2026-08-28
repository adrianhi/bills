import {
  AlertCircle,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/shared/ui";
import { useAccountSettings } from "../model/useAccountSettings";

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
  const { connections, confirmation, setConfirmation, notice, error, busy,
    startGoogle, sync, disconnect, exportData, deleteAccount } = model;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Privacidad y conexiones</DialogTitle>
          <DialogDescription>
            Controla las fuentes conectadas y tus derechos sobre los datos.
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Correo conectado</h3>
          </div>
          {connections.length ? (
            connections.map((connection) => (
              <div key={connection.id} className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{connection.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {connection.status === "REAUTH_REQUIRED"
                        ? "Necesita reconexión"
                        : connection.currentJob?.status === "PROCESSING"
                          ? "Sincronizando"
                          : connection.currentJob?.status === "PENDING"
                            ? "Sincronización en cola"
                            : (connection.failedEvents || 0) > 0
                              ? "Activa con fallos parciales"
                              : "Activa"}
                    </p>
                  </div>
                  <ShieldCheck
                    className={`h-4 w-4 ${(connection.failedEvents || 0) > 0 || connection.status !== "ACTIVE" ? "text-amber-500" : "text-emerald-500"}`}
                  />
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <p>
                    Última sincronización:{" "}
                    {connection.lastSuccessfulSyncAt
                      ? new Date(
                          connection.lastSuccessfulSyncAt,
                        ).toLocaleString("es-DO")
                      : "pendiente"}
                  </p>
                  {connection.lastSyncSummary && (
                    <p>
                      {connection.lastSyncSummary.created} creados ·{" "}
                      {connection.lastSyncSummary.ignored} ignorados ·{" "}
                      {connection.lastSyncSummary.failed} fallidos
                    </p>
                  )}
                  {(connection.failedEvents || 0) > 0 && (
                    <p className="text-amber-600 dark:text-amber-400">
                      {connection.failedEvents} correos pendientes de
                      reprocesamiento
                      {connection.lastErrorCode
                        ? ` · ${connection.lastErrorCode}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={Boolean(busy)}
                    onClick={() => void sync(connection.id)}
                  >
                    {busy === `sync:${connection.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}{" "}
                    Sincronizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-muted-foreground"
                    disabled={Boolean(busy)}
                    onClick={() => void disconnect(connection.id)}
                  >
                    <Unplug className="h-3 w-3" /> Desconectar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={busy === "google"}
              onClick={startGoogle}
            >
              {busy === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}{" "}
              Conectar Gmail
            </Button>
          )}
          <a
            href="/legal/google-api-disclosure"
            target="_blank"
            className="block text-xs text-muted-foreground underline"
          >
            Cómo bills. usa los datos de Google
          </a>
          {notice && (
            <div className="rounded-lg bg-sky-500/10 p-2 text-xs text-sky-700 dark:text-sky-300">
              {notice}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">Tus datos</h3>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={busy === "export"}
            onClick={exportData}
          >
            {busy === "export" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}{" "}
            Descargar copia completa en JSON
          </Button>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <a href="/legal/terms" target="_blank" className="underline">
              Términos
            </a>
            <a href="/legal/privacy" target="_blank" className="underline">
              Privacidad
            </a>
            <a
              href="/legal/data-deletion"
              target="_blank"
              className="underline"
            >
              Eliminación de datos
            </a>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-destructive/30 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Eliminar mi cuenta</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta acción desconecta Google y elimina permanentemente tu perfil,
            transacciones, reglas y conexiones. Escribe ELIMINAR para confirmar.
          </p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="ELIMINAR"
          />
          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={confirmation.trim().toUpperCase() !== "ELIMINAR" || busy === "delete"}
            onClick={deleteAccount}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}{" "}
            Eliminar cuenta permanentemente
          </Button>
        </section>
        {error && (
          <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
