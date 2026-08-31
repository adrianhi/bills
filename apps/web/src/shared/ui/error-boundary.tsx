import React from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { SafeDiagnosticButton } from './safe-diagnostic-button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private readonly handleRetry = () => this.setState({ error: null });

  private readonly handleReload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Algo salió mal</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                La aplicación encontró un error inesperado. Tus datos están seguros: puedes reintentar o recargar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={this.handleRetry} className="min-h-11 gap-2">
                <RefreshCw className="h-4 w-4" />Reintentar
              </Button>
              <Button type="button" variant="outline" onClick={this.handleReload} className="min-h-11">
                Recargar la app
              </Button>
            </div>
            <SafeDiagnosticButton error={error} area="aplicacion" />
          </CardContent>
        </Card>
      </div>
    );
  }
}
