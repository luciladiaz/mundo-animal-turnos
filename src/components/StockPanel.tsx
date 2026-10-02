"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatearPesos } from "@/lib/plata";
import { formatearFecha } from "@/lib/formatoFichas";
import { Campo, INPUT, INPUT_CHICO, InputPlata, MensajeError, aCentavos } from "@/components/ui/Campos";

interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
  _count: { productos: number };
}
interface Producto {
  id: string;
  nombre: string;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  controlaVencimiento: boolean;
  categoria: { nombre: string };
}
interface PorVencer {
  productoId: string;
  vencimiento: string;
  cantidad: number;
  codigo: string | null;
  producto: { nombre: string; activo: boolean };
}

const FORM_VACIO = {
  nombre: "",
  categoriaId: "",
  precio: "",
  costo: "",
  stockMinimo: "0",
  controlaVencimiento: false,
  cantidadInicial: "",
  lote: "",
  vencimiento: "",
};

export default function StockPanel() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [porVencer, setPorVencer] = useState<PorVencer[]>([]);
  const [hoy, setHoy] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState<typeof FORM_VACIO | null>(null);
  const [verCategorias, setVerCategorias] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [control, setControl] = useState<{ ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarCategorias = useCallback(async () => {
    setCategorias((await (await fetch("/api/categorias")).json()).categorias ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargarCategorias();
    (async () => setControl(await (await fetch("/api/stock/control")).json()))();
  }, [cargarCategorias]);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ q, categoriaId, filtro });
      const data = await (await fetch(`/api/productos?${params}`)).json();
      if (!cancelado) {
        setProductos(data.productos ?? []);
        setPorVencer(data.porVencer ?? []);
        setHoy(data.hoy ?? "");
      }
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [q, categoriaId, filtro]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const precio = aCentavos(form.precio);
    const costo = form.costo.trim() ? aCentavos(form.costo) : null;
    if (precio == null) return setError("Revisá el precio de venta");
    if (form.costo.trim() && costo == null) return setError("Revisá el costo");
    const cantidad = form.cantidadInicial.trim() ? Number(form.cantidadInicial) : 0;
    if (!Number.isInteger(cantidad) || cantidad < 0) return setError("El stock inicial tiene que ser un número entero");
    if (cantidad > 0 && form.controlaVencimiento && !form.vencimiento) return setError("Indicá el vencimiento del stock inicial");

    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        categoriaId: form.categoriaId,
        precioVenta: precio,
        costo,
        stockMinimo: Number(form.stockMinimo) || 0,
        controlaVencimiento: form.controlaVencimiento,
        stockInicial: cantidad > 0 ? { cantidad, codigoLote: form.lote || null, vencimiento: form.vencimiento || null } : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "No se pudo crear el producto");
    router.push(`/admin/stock/${data.producto.id}`);
  }

  async function agregarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nuevaCategoria }) });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo agregar");
    setNuevaCategoria("");
    await cargarCategorias();
  }

  async function editarCategoria(c: Categoria, cambios: { nombre?: string; activa?: boolean }) {
    setError(null);
    const res = await fetch(`/api/categorias/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo guardar");
    await cargarCategorias();
  }

  const activas = categorias.filter((c) => c.activa);

  return (
    <div className="flex flex-col gap-4">
      {control && !control.ok && (
        <div className="rounded-xl bg-peligro-50 px-4 py-2 text-sm text-peligro-600">
          ⚠️ El control de stock encontró diferencias entre el stock y sus movimientos. Avisá para revisarlo.
        </div>
      )}
      <MensajeError error={error} />

      <div className="flex flex-wrap gap-2">
        {!form && (
          <button
            onClick={() => setForm({ ...FORM_VACIO, categoriaId: activas[0]?.id ?? "" })}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
          >
            + Nuevo producto
          </button>
        )}
        <button onClick={() => setVerCategorias(!verCategorias)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
          {verCategorias ? "Ocultar categorías" : "Categorías"}
        </button>
      </div>

      {verCategorias && (
        <section className="flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
          <ul className="flex flex-col divide-y divide-humo-100 text-sm">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className={c.activa ? "" : "text-humo-400"}>
                  {c.nombre} <span className="text-xs text-humo-400">· {c._count.productos} productos{!c.activa && " · desactivada"}</span>
                </span>
                <span className="flex gap-2">
                  <button
                    onClick={() => {
                      const nombre = window.prompt("Nuevo nombre de la categoría", c.nombre);
                      if (nombre && nombre.trim() !== c.nombre) editarCategoria(c, { nombre: nombre.trim() });
                    }}
                    className="btn-secondary rounded-md px-3 py-1 text-xs font-medium"
                  >
                    Renombrar
                  </button>
                  <button onClick={() => editarCategoria(c, { activa: !c.activa })} className="btn-secondary rounded-md px-3 py-1 text-xs font-medium">
                    {c.activa ? "Desactivar" : "Activar"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={agregarCategoria} className="flex gap-2">
            <input required value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Nueva categoría, ej: Alimentos" className={`${INPUT} max-w-xs`} />
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Agregar</button>
          </form>
        </section>
      )}

      {form && (
        <form onSubmit={crear} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre">
              <input required autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Categoría">
              <select required value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} className={INPUT}>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Precio de venta">
              <InputPlata texto={form.precio} onChange={(t) => setForm({ ...form, precio: t })} />
            </Campo>
            <Campo etiqueta="Costo (opcional)">
              <InputPlata texto={form.costo} onChange={(t) => setForm({ ...form, costo: t })} />
            </Campo>
            <Campo etiqueta="Stock mínimo (avisa cuando hay que reponer)">
              <input inputMode="numeric" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value.replace(/\D/g, "") })} className={INPUT} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-humo-700">
              <input type="checkbox" checked={form.controlaVencimiento} onChange={(e) => setForm({ ...form, controlaVencimiento: e.target.checked })} />
              Controlar vencimiento por lote (medicamentos, vacunas)
            </label>
          </div>
          <div className="grid gap-3 rounded-lg bg-humo-50 p-3 sm:grid-cols-3">
            <Campo etiqueta="Stock inicial (opcional)">
              <input inputMode="numeric" value={form.cantidadInicial} onChange={(e) => setForm({ ...form, cantidadInicial: e.target.value.replace(/\D/g, "") })} className={INPUT} />
            </Campo>
            {form.controlaVencimiento && (
              <>
                <Campo etiqueta="Lote (opcional)">
                  <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className={INPUT} />
                </Campo>
                <Campo etiqueta="Vencimiento">
                  <input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} className={INPUT} />
                </Campo>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Crear producto</button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {porVencer.length > 0 && (
        <section className="rounded-xl border border-alerta-500/30 bg-alerta-50 p-3 text-sm text-alerta-600">
          <p className="font-medium">Vencen en los próximos 60 días</p>
          <ul>
            {porVencer.slice(0, 8).map((l, i) => (
              <li key={i}>
                <Link href={`/admin/stock/${l.productoId}`} className="hover:underline">
                  {l.producto.nombre}
                </Link>{" "}
                · {l.cantidad} u. · {l.vencimiento < hoy ? "VENCIDO el" : "vence el"} {formatearFecha(l.vencimiento)}
                {l.codigo && ` (lote ${l.codigo})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto..." className={`${INPUT} max-w-xs`} />
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={INPUT_CHICO}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={INPUT_CHICO}>
          <option value="">Todos</option>
          <option value="bajo">A reponer (stock mínimo o menos)</option>
          <option value="negativo">Stock negativo</option>
          <option value="inactivos">Desactivados</option>
        </select>
      </div>

      {productos === null ? (
        <p className="text-sm text-humo-500">Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p className="text-sm text-humo-500">No hay productos que coincidan.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
          {productos.map((p) => {
            const color = p.stock < 0 ? "text-peligro-600" : p.stock <= p.stockMinimo ? "text-alerta-600" : "text-humo-900";
            return (
              <li key={p.id}>
                <Link href={`/admin/stock/${p.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-mora-50">
                  <span>
                    {p.nombre} <span className="text-xs text-humo-400">· {p.categoria.nombre}</span>
                  </span>
                  <span className="flex items-center gap-4 tabular-nums">
                    <span className="text-humo-500">{formatearPesos(p.precioVenta)}</span>
                    <span className={`w-20 text-right font-medium ${color}`}>{p.stock} u.</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
