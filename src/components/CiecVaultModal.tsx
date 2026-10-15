import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  Copy,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { sileo } from "sileo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface CiecVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName: string;
  clientRfc: string;
}

export function CiecVaultModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientRfc,
}: CiecVaultModalProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("Presentación de Declaración SAT");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decrypted state
  const [decryptedCiec, setDecryptedCiec] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(15);
  const [isCopied, setIsCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError(null);
      setDecryptedCiec(null);
      setIsCopied(false);
      setCountdown(15);
    } else {
      // Memory purge
      setDecryptedCiec(null);
      setPin("");
    }
  }, [isOpen]);

  // Countdown auto-lock timer
  useEffect(() => {
    let timer: any;
    if (decryptedCiec && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setDecryptedCiec(null);
            onClose();
            sileo.info({ title: "Bóveda SAT bloqueada automáticamente por tiempo límite" });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [decryptedCiec, countdown, onClose]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError("Acceso denegado: Solo el Administrador tiene autorización para acceder a la Bóveda SAT");
      return;
    }
    if (!clientId) return;
    if (!pin.trim()) {
      setError("Por favor ingresa el PIN de seguridad");
      return;
    }

    setIsLoading(true);
    setError(null);

    const effectiveReason = reason === "otro" ? customReason.trim() || "Consulta autorizada" : reason;
    const userEmail = profile?.email || "usuario_sistema";

    try {
      const { data, error: rpcError } = await supabase.rpc("reveal_client_ciec", {
        p_client_id: clientId,
        p_requested_by: userEmail,
        p_reason: effectiveReason,
        p_pin: pin.trim(),
      });

      if (rpcError) throw rpcError;

      if (!data || !data.success) {
        setError(data?.error || "PIN de seguridad incorrecto");
        setIsLoading(false);
        return;
      }

      setDecryptedCiec(data.ciec || "Sin contraseña asignada");
      setCountdown(15);
      setIsLoading(false);
      sileo.success({ title: "Credencial SAT desencriptada correctamente" });
    } catch (err: any) {
      setError(err.message || "Error al autenticar en la bóveda");
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!decryptedCiec) return;
    navigator.clipboard.writeText(decryptedCiec);
    setIsCopied(true);
    sileo.success({
      title: "Contraseña CIEC copiada al portapapeles",
      description: "Por seguridad, utilízala de inmediato.",
    });
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Bóveda Fiscal SAT
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">
                  AES-256
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Acceso a contraseña CIEC de {clientName} ({clientRfc})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!isAdmin ? (
          /* NON-ADMIN RESTRICTION VIEW */
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Acceso Restringido a Administradores</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Por políticas de estricta seguridad fiscal, la Bóveda de credenciales CIEC cifradas solo puede ser consultada por usuarios con rol de <strong>Administrador</strong>.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Si requieres esta contraseña para una gestión oficial ante el SAT, por favor solicítala directamente al Administrador.
              </p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full">
                Entendido / Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : !decryptedCiec ? (
          /* STEP 1: PIN CHALLENGE FORM (ADMIN ONLY) */
          <form onSubmit={handleUnlock} className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Acceso Confidencial Auditado</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Esta credencial permite realizar trámites y declaraciones ante el SAT. Todo acceso queda registrado en la bitácora con usuario, fecha y motivo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Motivo del acceso</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="Presentación de Declaración SAT">Presentación de Declaración SAT</SelectItem>
                  <SelectItem value="Consulta de Opinión de Cumplimiento (32-D)">Consulta de Opinión de Cumplimiento (32-D)</SelectItem>
                  <SelectItem value="Generación o Descarga de CFDI / Facturas">Generación o Descarga de CFDI / Facturas</SelectItem>
                  <SelectItem value="Actualización de Situación Fiscal">Actualización de Situación Fiscal</SelectItem>
                  <SelectItem value="otro">Otro motivo justificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reason === "otro" && (
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Especifica el motivo</label>
                <Input
                  placeholder="Ej. Revisión de requerimiento fiscal..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">PIN de Seguridad de la Bóveda</label>
                <span className="text-[10px] text-muted-foreground font-mono">Default: 1234</span>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Ingresa PIN (4 dígitos)"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(null);
                  }}
                  className="pl-9 font-mono tracking-widest text-center text-sm font-bold bg-muted/20"
                  maxLength={8}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <ShieldAlert className="h-3 w-3" /> {error}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando...
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Desbloquear Credencial
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* STEP 2: UNLOCKED STATE WITH TIMER */
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  Contraseña CIEC Desencriptada
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-background px-2 py-0.5 rounded-full border border-emerald-300">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <span>Se oculta en {countdown}s</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-md border border-emerald-300 shadow-inner">
                <span className="font-mono text-base font-extrabold text-foreground tracking-wider select-all">
                  {decryptedCiec}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs border-emerald-300 hover:bg-emerald-50"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-primary" /> Copiar
                    </>
                  )}
                </Button>
              </div>

              {/* Countdown visual indicator */}
              <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 15) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Auditoría: Registro guardado en bitácora.</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setDecryptedCiec(null);
                  onClose();
                }}
              >
                <Lock className="h-3 w-3 mr-1" /> Bloquear ahora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
