"use client";

import { useEffect, useState, useCallback } from "react";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  esAdmin: boolean;
  permisos: string[];
  activo: boolean;
}

const PESTAÑAS: { key: string; label: string }[] = [
  { key: "turnos", label: "Turnos" },
  { key: "servicios", label: "Servicios" },
  { key: "configuracion", label: "Configuración" },
];

const FORM_VACIO = { nombre: "", email: "", password: "", esAdmin: false, permisos: [] as string[] };

function CheckboxPestañas({
  permisos,
  disabled,
  onChange,
}: {
  permisos: string[];
  disabled: boolean;
  onChange: (permisos: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(permisos.includes(key) ? permisos.filter((p) => p !== key) : [...permisos, key]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {PESTAÑAS.map((p) => (
        <label
          key={p.key}
          className={`flex items-center gap-1.5 text-sm ${disabled ? "text-humo-300" : "text-humo-700"}`}
        >
          <input
            type="checkbox"
            checked={disabled ? true : permisos.includes(p.key)}
            disabled={disabled}
            onChange={() => toggle(p.key)}
            className="h-4 w-4 rounded border-humo-300"
          />
          {p.label}
        </label>
      ))}
    </div>
  );
}

export default function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoPasswordDe, setCambiandoPasswordDe] = useState<string | null>(null);
  const [passwordNueva, setPasswordNueva] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", esAdmin: false, permisos: [] as string[] });

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los usuarios");
      setUsuarios(data.usuarios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargarUsuarios();
  }, [cargarUsuarios]);

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el usuario");
        return;
      }
      setForm(FORM_VACIO);
      setMostrarForm(false);
      await cargarUsuarios();
    } finally {
      setGuardando(false);
    }
  }

  function abrirEditar(u: Usuario) {
    setEditandoId(u.id);
    setEditForm({ nombre: u.nombre, esAdmin: u.esAdmin, permisos: u.permisos });
    setCambiandoPasswordDe(null);
    setError(null);
  }

  async function guardarEdicion(id: string) {
    setError(null);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el usuario");
      return;
    }
    setEditandoId(null);
    await cargarUsuarios();
  }

  async function toggleActivo(u: Usuario) {
    setError(null);
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar el usuario");
      return;
    }
    await cargarUsuarios();
  }

  async function guardarPassword(id: string) {
    setError(null);
    if (passwordNueva.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordNueva }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la contraseña");
      return;
    }
    setCambiandoPasswordDe(null);
    setPasswordNueva("");
  }

  async function eliminarUsuario(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    setError(null);
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar el usuario");
      return;
    }
    await cargarUsuarios();
  }

  if (cargando) return <p className="text-sm text-humo-500">Cargando usuarios...</p>;

  return (
    <section className="card-suave rounded-xl border border-humo-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-humo-500">
          Cuentas con acceso al panel. Elegí el nombre y a qué pestañas puede entrar cada persona. Solo un
          administrador puede crear o modificar usuarios.
        </p>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="btn-primary w-fit shrink-0 rounded-lg px-3 py-1.5 text-sm"
          >
            + Nuevo usuario
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-peligro-50 px-3 py-2 text-sm text-peligro-600">{error}</div>}

      {mostrarForm && (
        <form onSubmit={crearUsuario} className="mb-4 flex flex-col gap-3 rounded-lg bg-humo-50 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Nombre</span>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
              placeholder="Ej: María"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Nombre de usuario</span>
            <input
              required
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
              placeholder="Ej: maria"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-humo-600">Contraseña (mínimo 8 caracteres)</span>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-humo-700">
            <input
              type="checkbox"
              checked={form.esAdmin}
              onChange={(e) => setForm({ ...form, esAdmin: e.target.checked })}
              className="h-4 w-4 rounded border-humo-300"
            />
            Administrador (acceso total, puede gestionar usuarios)
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-humo-600">Pestañas permitidas</span>
            <CheckboxPestañas
              permisos={form.permisos}
              disabled={form.esAdmin}
              onChange={(permisos) => setForm({ ...form, permisos })}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="btn-primary rounded-lg px-4 py-2 text-sm">
              {guardando ? "Creando..." : "Crear usuario"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setForm(FORM_VACIO);
              }}
              className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {usuarios.map((u) => (
          <div key={u.id} className="card-suave rounded-xl border border-humo-100 p-3">
            {editandoId === u.id ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-humo-600">Nombre</span>
                  <input
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="rounded-lg border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-humo-700">
                  <input
                    type="checkbox"
                    checked={editForm.esAdmin}
                    onChange={(e) => setEditForm({ ...editForm, esAdmin: e.target.checked })}
                    className="h-4 w-4 rounded border-humo-300"
                  />
                  Administrador (acceso total, puede gestionar usuarios)
                </label>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-humo-600">Pestañas permitidas</span>
                  <CheckboxPestañas
                    permisos={editForm.permisos}
                    disabled={editForm.esAdmin}
                    onChange={(permisos) => setEditForm({ ...editForm, permisos })}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarEdicion(u.id)}
                    className="btn-primary rounded-lg px-4 py-2 text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-humo-900">
                      {u.nombre}{" "}
                      {!u.activo && <span className="text-xs font-normal text-humo-400">(desactivado)</span>}
                    </p>
                    <p className="text-sm text-humo-500">{u.email}</p>
                    <p className="mt-0.5 text-xs text-humo-400">
                      {u.esAdmin
                        ? "Administrador · acceso total"
                        : u.permisos.length > 0
                          ? `Acceso a: ${u.permisos
                              .map((p) => PESTAÑAS.find((t) => t.key === p)?.label ?? p)
                              .join(", ")}`
                          : "Sin pestañas asignadas (solo Dashboard)"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => abrirEditar(u)}
                      className="btn-secondary rounded-md px-2.5 py-1 text-xs font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActivo(u)}
                      className="btn-secondary rounded-md px-2.5 py-1 text-xs font-medium"
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => {
                        setCambiandoPasswordDe(u.id);
                        setPasswordNueva("");
                        setError(null);
                      }}
                      className="btn-secondary rounded-md px-2.5 py-1 text-xs font-medium"
                    >
                      Cambiar contraseña
                    </button>
                    <button
                      onClick={() => eliminarUsuario(u)}
                      className="btn-danger rounded-md px-2.5 py-1 text-xs font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {cambiandoPasswordDe === u.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-humo-50 p-2">
                    <input
                      type="password"
                      minLength={8}
                      placeholder="Nueva contraseña (mín. 8 caracteres)"
                      value={passwordNueva}
                      onChange={(e) => setPasswordNueva(e.target.value)}
                      className="rounded border border-humo-200 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => guardarPassword(u.id)}
                      className="btn-primary rounded-md px-3 py-1.5 text-xs"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setCambiandoPasswordDe(null)}
                      className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
