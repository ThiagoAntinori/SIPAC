import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { User, CrearUsuarioRequest, ActualizarUsuarioRequest } from '../types';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  KeyRound,
  Power,
  Trash2,
  Search,
  Users,
  Shield,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
} from 'lucide-react';

const inputCls =
  'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1.5';

export const SeguridadPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Filters
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState<User | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetUserForDelete, setTargetUserForDelete] = useState<User | null>(null);

  // User form
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'Admin' | 'Pañolero' | 'Supervisor'>('Pañolero');
  const [activo, setActivo] = useState(true);

  // Password form
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Query
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuariosList'],
    queryFn: () => usuariosApi.getAll(),
  });

  // Metrics
  const metrics = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter((u) => u.rol === 'Admin').length;
    const operarios = usuarios.filter((u) => u.rol === 'Pañolero' || u.rol === 'Supervisor').length;
    const activos = usuarios.filter((u) => u.activo).length;
    const inactivos = total - activos;
    return { total, admins, operarios, activos, inactivos };
  }, [usuarios]);

  // Filtered list
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      if (rolFilter && u.rol !== rolFilter) return false;
      if (estadoFilter === 'activos' && !u.activo) return false;
      if (estadoFilter === 'inactivos' && u.activo) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const inNombre = u.nombreCompleto.toLowerCase().includes(s);
        const inUsername = u.username.toLowerCase().includes(s);
        if (!inNombre && !inUsername) return false;
      }
      return true;
    });
  }, [usuarios, rolFilter, estadoFilter, search]);

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        const data: ActualizarUsuarioRequest = {
          nombreCompleto,
          username,
          rol,
          activo,
        };
        return usuariosApi.update(editingUser.id, data);
      } else {
        const data: CrearUsuarioRequest = {
          nombreCompleto,
          username,
          password,
          rol,
          activo,
        };
        return usuariosApi.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuariosList'] });
      toast.success(editingUser ? 'Usuario actualizado con éxito' : 'Usuario registrado exitosamente');
      closeUserModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    },
  });

  const cambiarPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!targetUserForPassword) return;
      return usuariosApi.cambiarPassword(targetUserForPassword.id, { nuevaPassword });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Contraseña actualizada exitosamente');
      closePasswordModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar la contraseña');
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async (id: number) => {
      return usuariosApi.toggleActivo(id);
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['usuariosList'] });
      toast.success(
        updatedUser.activo
          ? `Usuario '${updatedUser.username}' activado`
          : `Usuario '${updatedUser.username}' desactivado`
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del usuario');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return usuariosApi.delete(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['usuariosList'] });
      toast.success(res.message);
      closeDeleteModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al procesar la baja');
    },
  });

  // Handlers
  const openCreateModal = () => {
    setEditingUser(null);
    setNombreCompleto('');
    setUsername('');
    setPassword('');
    setRol('Pañolero');
    setActivo(true);
    setUserModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setNombreCompleto(u.nombreCompleto);
    setUsername(u.username);
    setPassword('');
    setRol(u.rol);
    setActivo(u.activo);
    setUserModalOpen(true);
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const openPasswordModal = (u: User) => {
    setTargetUserForPassword(u);
    setNuevaPassword('');
    setConfirmarPassword('');
    setShowPassword(false);
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setTargetUserForPassword(null);
  };

  const openDeleteModal = (u: User) => {
    setTargetUserForDelete(u);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setTargetUserForDelete(null);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !username.trim()) {
      toast.error('Nombre y usuario son obligatorios');
      return;
    }
    if (!editingUser && (!password || password.length < 6)) {
      toast.error('La contraseña inicial debe tener al menos 6 caracteres');
      return;
    }
    saveUserMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPassword || nuevaPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    cambiarPasswordMutation.mutate();
  };

  const rolBadgeCls = (rolName: string) => {
    switch (rolName) {
      case 'Admin':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Supervisor':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <span>Módulo de Seguridad y Usuarios</span>
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Administración de cuentas de acceso, roles del personal y directivas de seguridad
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99] self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total de Cuentas</p>
            <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Administradores</p>
            <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{metrics.admins}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pañol / Supervisión</p>
            <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{metrics.operarios}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Cuentas Activas</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-lg font-bold text-slate-900 leading-tight">{metrics.activos}</span>
              {metrics.inactivos > 0 && (
                <span className="text-xs font-semibold text-rose-600">({metrics.inactivos} inactivos)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o nombre de usuario (@username)..."
            className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          />
        </div>

        <div className="w-full md:w-44">
          <select
            value={rolFilter}
            onChange={(e) => setRolFilter(e.target.value)}
            className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          >
            <option value="">Todos los Roles</option>
            <option value="Admin">Administradores</option>
            <option value="Pañolero">Pañoleros</option>
            <option value="Supervisor">Supervisores</option>
          </select>
        </div>

        <div className="w-full md:w-44">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          >
            <option value="">Todos los Estados</option>
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando directorio de usuarios...</div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No se encontraron usuarios coincidentes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol en Sistema</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones de Seguridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsuarios.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 transition-colors ${!u.activo ? 'bg-slate-50/50 opacity-60' : ''}`}
                    >
                      {/* Avatar & User Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                              u.rol === 'Admin'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {u.nombreCompleto ? u.nombreCompleto.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900 text-sm leading-tight">
                                {u.nombreCompleto}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-mono font-medium">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${rolBadgeCls(
                            u.rol
                          )}`}
                        >
                          {u.rol}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit user */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset password */}
                          <button
                            onClick={() => openPasswordModal(u)}
                            className="p-1.5 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-md border border-slate-200 hover:border-orange-200 transition-colors"
                            title="Cambiar contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active */}
                          <button
                            onClick={() => toggleActivoMutation.mutate(u.id)}
                            disabled={isSelf && u.activo}
                            className={`p-1.5 rounded-md border transition-colors ${
                              isSelf && u.activo
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : u.activo
                                ? 'bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border-slate-200 hover:border-amber-200'
                                : 'bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-200'
                            }`}
                            title={
                              isSelf && u.activo
                                ? 'No puedes desactivar tu propia cuenta de administrador'
                                : u.activo
                                ? 'Desactivar cuenta'
                                : 'Activar cuenta'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => openDeleteModal(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-md border transition-colors ${
                              isSelf
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200'
                            }`}
                            title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit User */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  {editingUser ? (
                    <Edit2 className="w-4 h-4 text-orange-600" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-orange-600" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editingUser ? 'Editar Cuenta de Usuario' : 'Registrar Nuevo Usuario'}
                </h3>
              </div>
              <button
                onClick={closeUserModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className={labelCls}>Nombre Completo *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Roberto Gómez"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Nombre de Usuario (Login) *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="Ej. rgomez"
                  className={`${inputCls} font-mono`}
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className={labelCls}>Contraseña Inicial *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={inputCls}
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    El usuario podrá modificarla posteriormente.
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Rol en el Sistema *</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className={inputCls}
                  disabled={editingUser?.id === currentUser?.id}
                >
                  <option value="Pañolero">Pañolero (Acceso a Pañol, Stock, Egresos, Compras)</option>
                  <option value="Supervisor">Supervisor (Gestión y Control de Pañol)</option>
                  <option value="Admin">Administrador (Control Total y Seguridad)</option>
                </select>
                {editingUser?.id === currentUser?.id && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    No puedes modificar el rol de tu propia cuenta en sesión.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="userActivoCheck"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  disabled={editingUser?.id === currentUser?.id}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="userActivoCheck" className="text-xs font-semibold text-slate-800 select-none">
                  Cuenta Activa (Habilitada para iniciar sesión)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveUserMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {saveUserMutation.isPending ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {passwordModalOpen && targetUserForPassword && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <KeyRound className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Actualizar Contraseña</h3>
                  <p className="text-xs text-slate-500">Usuario: @{targetUserForPassword.username}</p>
                </div>
              </div>
              <button
                onClick={closePasswordModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className={labelCls}>Nueva Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputCls} pr-10`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Confirmar Contraseña *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Reingrese la contraseña"
                  className={inputCls}
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Al restablecer la contraseña, se revocarán las sesiones abiertas del usuario requiriendo nuevo ingreso.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cambiarPasswordMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {cambiarPasswordMutation.isPending ? 'Guardando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deleteModalOpen && targetUserForDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">¿Confirmar baja de usuario?</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Usuario: <span className="font-semibold text-slate-800">{targetUserForDelete.nombreCompleto}</span>{' '}
                    (@{targetUserForDelete.username})
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Si el usuario posee movimientos registrados en el sistema (egresos, compras o registros de trazabilidad),
                la cuenta se <strong className="text-slate-900">desactivará automáticamente</strong> para proteger el
                historial de auditoría. Si no posee transacciones vinculadas, se eliminará por completo.
              </p>

              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(targetUserForDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all"
                >
                  {deleteMutation.isPending ? 'Procesando...' : 'Confirmar Baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

