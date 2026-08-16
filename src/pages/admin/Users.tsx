import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser } from "@/api/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/models";
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Building2,
  Shield,
  Mail,
  X,
  Loader2,
} from "lucide-react";
import { sileo } from "sileo";

export function Users() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [department, setDepartment] = useState("");

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      sileo.success({ title: "Usuario registrado con éxito" });
      setIsModalOpen(false);
      // Reset form
      setEmail("");
      setFullName("");
      setRole("operator");
      setDepartment("");
    },
    onError: (error: any) => {
      sileo.error({ title: `Error al registrar usuario: ${error.message}` });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || !department) {
      sileo.error({ title: "Por favor completa todos los campos." });
      return;
    }

    createUserMutation.mutate({
      email,
      fullName,
      role,
      department,
    });
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = user.full_name || "";
    const email = user.email || "";
    const department = user.department || "";
    const role = user.role || "";
    return (
      fullName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      department.toLowerCase().includes(searchLower) ||
      role.toLowerCase().includes(searchLower)
    );
  });

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-card border border-border rounded-xl">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-foreground">Acceso Restringido</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Esta página contiene funciones administrativas restringidas. Solo los usuarios con rol de administrador pueden ver o modificar el personal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Control de Usuarios</h2>
          <p className="text-muted-foreground mt-1">
            Administra el personal, sus roles de acceso y departamentos asignados en planta.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Registrar Usuario
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo, rol o departamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground"
          />
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 border-b border-border">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-12" />
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="py-6 text-center text-destructive">
            Ocurrió un error al cargar los usuarios. Por favor inténtalo de nuevo.
          </CardContent>
        </Card>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 bg-slate-50/50 dark:bg-slate-900/20 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <UsersIcon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold truncate max-w-[150px] text-foreground">
                    {user.full_name}
                  </CardTitle>
                </div>
                <Badge
                  variant={user.role === "admin" ? "default" : user.role === "project_manager" ? "outline" : "secondary"}
                  className={user.role === "project_manager" ? "border-primary text-primary bg-primary/10 capitalize" : "capitalize"}
                >
                  <Shield className="mr-1 h-3 w-3 inline" />
                  {user.role === "project_manager" ? "Gestor de Proyectos" : user.role}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Dpto: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{user.department}</strong></span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right pt-2 border-t border-border">
                  Registrado: {new Date(user.created_at).toLocaleDateString("es-MX")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-border rounded-lg bg-slate-50 dark:bg-slate-900/10">
          <p className="text-muted-foreground">No se encontraron usuarios registrados.</p>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-lg border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Registrar Nuevo Usuario</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                Crea un perfil de operador o administrador.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  placeholder="ej. Sofía Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ej. sofia@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="operator">Operator</option>
                    <option value="project_manager">Gestor de Proyectos (Project Manager)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    placeholder="ej. Printing"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createUserMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
