"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatearPesos } from "@/lib/plata";
import { formatearFecha } from "@/lib/formatoFichas";
import { Campo, INPUT, InputPlata, MensajeError, aCentavos, centavosATexto } from "@/components/ui/Campos";

interface Lote {
  id: string;
  generico: boolean;
  codigo: string | null;
  vencimiento: string | null;
  cantidad: number;
}
interface Movimiento {
  id: string;
  tipo: "INICIAL" | "COMPRA" | "VENTA" | "ANULACION_VENTA" | "AJUSTE";
  cantidad: number;
  motivo: string | null;
  usuario: string;
  createdAt: string;
  lote: { codigo: string | null; vencimiento: string | null; generico: boolean };
  ventaItem: { venta: { numero: number } } | null;
}
interface Producto {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: { nombre: string };
  precioVenta: number;
  costo: number | null;
  stockMinimo: number;
  controlaVencimiento: boolean;
  activo: boolean;
  stock: number;
  lotes: Lote[];
  movimientos: Movimiento[];
}
interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
}

const TIPO: Record<Movimiento["tipo"], string> = {
  INICIAL: "Stock inicial",
  COMPRA: "Ingreso",
  VENTA: "Venta",
  ANULACION_VENTA: "Anulación de venta",
  AJUSTE: "Ajuste",
};

const nombreLote = (l: { generico: boolean; codigo: string | null; vencimiento: string | null }) =>
  l.generico ? "Sin lote" : `${l.codigo ? `Lote ${l.codigo}` : "Lote"}${l.vencimiento ? ` · vence ${formatearFecha(l.vencimiento)}` : ""}`;

export default function FichaProducto({ id, puedeAjustar }: { id: string; puedeAjustar: boolean }) {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [edicion, setEdicion] = useState<{ nombre: string; categoriaId: string; precio: string; costo: string; stockMinimo: string; controlaVencimiento: boolean } | null>(null);
  const [ingreso, setIngreso] = useState<{ cantidad: string; lote: string; vencimiento: string; motivo: string } | null>(null);
  const [ajuste, setAjuste] = useState<{ signo: "+" | "-"; cantidad: string; loteId: string; motivo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/productos/${id}`);
    if (!res.ok) return setNoEncontrado(true);
    setProducto((await res.json()).producto);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar, patrón estándar.
    cargar();
    (async () => setCategorias((await (await fetch("/api/categorias")).json()).categorias ?? []))();
  }, [cargar]);

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!edicion || !producto) return;
    const precio = aCentavos(edicion.precio);
    const costo = edicion.costo.trim() ? aCentavos(edicion.costo) : null;
    if (precio == null) return setError("Revisá el precio");
    if (edicion.costo.trim() && costo == null) return setError("Revisá el costo");
    setError(null);
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: edicion.nombre,
        categoriaId: edicion.categoriaId,
        precioVenta: precio,
        costo,
        stockMinimo: Number(edicion.stockMinimo) || 0,
        controlaVencimiento: edicion.controlaVencimiento,
      }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo guardar");
    setEdicion(null);
    await cargar();
  }

  async function alternarActivo() {
    if (!producto) return;
    setError(null);
    const res = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: producto.nombre,
        categoriaId: producto.categoriaId,
        precioVenta: producto.precioVenta,
        costo: producto.costo,
        stockMinimo: producto.stockMinimo,
        controlaVencimiento: producto.controlaVencimiento,
        activo: !producto.activo,
      }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "No se pudo cambiar");
    await cargar();
  }

  async function operar(cuerpo: object, exito: string) {
    setError(null);
    const res = await fetch(`/api/productos/${id}/stock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar");
      return false;
    }
    setAviso(`${exito}. Stock actual: ${data.stock} u.`);
    await cargar();
    return true;
  }

  async function guardarIngreso(e: React.FormEvent) {
    e.preventDefault();
    if (!ingreso) return;
    const cantidad = Number(ingreso.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) return setError("La cantidad tiene que ser un número entero mayor a 0");
    const ok = await operar(
      { accion: "ingreso", cantidad, codigoLote: ingreso.lote || null, vencimiento: ingreso.vencimiento || null, motivo: ingreso.motivo || null },
      `Ingresaron ${cantidad} u.`
    );
    if (ok) setIngreso(null);
  }

  async function guardarAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!ajuste) return;
    const n = Number(ajuste.cantidad);
    if (!Number.isInteger(n) || n < 1) return setError("La cantidad tiene que ser un número entero mayor a 0");
    const cantidad = ajuste.signo === "+" ? n : -n;
    const ok = await operar({ accion: "ajuste", cantidad, loteId: ajuste.loteId || null, motivo: ajuste.motivo }, `Ajuste de ${cantidad > 0 ? "+" : ""}${cantidad} u. registrado`);
    if (ok) setAjuste(null);
  }

  if (noEncontrado) return <p className="text-sm text-humo-500">No se encontró este producto.</p>;
  if (!producto) return <p className="text-sm text-humo-500">Cargando...</p>;

  const lotesVisibles = producto.lotes.filter((l) => l.cantidad !== 0 || !l.generico);
  const colorStock = producto.stock < 0 ? "text-peligro-600" : producto.stock <= producto.stockMinimo ? "text-alerta-600" : "text-humo-900";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/stock" className="w-fit text-sm text-humo-500 hover:text-humo-800">
        ← Stock
      </Link>
      {aviso && <div className="rounded-xl bg-exito-50 px-4 py-2 text-sm text-exito-600">{aviso}</div>}
      <MensajeError error={error} />

      {!edicion ? (
        <section className="card-suave flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-semibold text-humo-900">
                {producto.nombre}
                {!producto.activo && <span className="ml-2 text-sm font-normal text-humo-400">desactivado</span>}
              </h1>
              <p className="text-sm text-humo-500">{producto.categoria.nombre}</p>
            </div>
            <p className={`font-display text-2xl font-semibold tabular-nums ${colorStock}`}>{producto.stock} u.</p>
          </div>
          <p className="text-sm text-humo-600">
            Precio {formatearPesos(producto.precioVenta)}
            {producto.costo != null && ` · costo ${formatearPesos(producto.costo)}`} · stock mínimo {producto.stockMinimo}
            {producto.controlaVencimiento && " · controla vencimiento"}
          </p>
          {producto.stock < 0 && (
            <p className="text-xs text-peligro-600">Stock negativo: se vendió más de lo cargado. Registrá el ingreso de mercadería o hacé un ajuste.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => setIngreso({ cantidad: "", lote: "", vencimiento: "", motivo: "" })} className="btn-primary rounded-md px-3 py-1.5 text-xs">
              + Ingreso de mercadería
            </button>
            {puedeAjustar && (
              <button onClick={() => setAjuste({ signo: "-", cantidad: "", loteId: "", motivo: "" })} className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
                Ajustar stock
              </button>
            )}
            <button
              onClick={() =>
                setEdicion({
                  nombre: producto.nombre,
                  categoriaId: producto.categoriaId,
                  precio: centavosATexto(producto.precioVenta),
                  costo: producto.costo != null ? centavosATexto(producto.costo) : "",
                  stockMinimo: String(producto.stockMinimo),
                  controlaVencimiento: producto.controlaVencimiento,
                })
              }
              className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
            >
              Editar datos y precio
            </button>
            <button onClick={alternarActivo} className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
              {producto.activo ? "Desactivar" : "Activar"}
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={guardarEdicion} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre">
              <input required value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} className={INPUT} />
            </Campo>
            <Campo etiqueta="Categoría">
              <select value={edicion.categoriaId} onChange={(e) => setEdicion({ ...edicion, categoriaId: e.target.value })} className={INPUT}>
                {categorias
                  .filter((c) => c.activa || c.id === edicion.categoriaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </Campo>
            <Campo etiqueta="Precio de venta">
              <InputPlata texto={edicion.precio} onChange={(t) => setEdicion({ ...edicion, precio: t })} />
            </Campo>
            <Campo etiqueta="Costo (opcional)">
              <InputPlata texto={edicion.costo} onChange={(t) => setEdicion({ ...edicion, costo: t })} />
            </Campo>
            <Campo etiqueta="Stock mínimo">
              <input inputMode="numeric" value={edicion.stockMinimo} onChange={(e) => setEdicion({ ...edicion, stockMinimo: e.target.value.replace(/\D/g, "") })} className={INPUT} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-humo-700">
              <input type="checkbox" checked={edicion.controlaVencimiento} onChange={(e) => setEdicion({ ...edicion, controlaVencimiento: e.target.checked })} />
              Controlar vencimiento por lote
            </label>
          </div>
          <p className="text-xs text-humo-400">El stock no se cambia acá: se usa “Ingreso de mercadería” o “Ajustar stock”, así queda registrado.</p>
          <div className="flex gap-2">
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Guardar</button>
            <button type="button" onClick={() => setEdicion(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {ingreso && (
        <form onSubmit={guardarIngreso} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <p className="font-medium text-humo-900">Ingreso de mercadería</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Cantidad">
              <input required autoFocus inputMode="numeric" value={ingreso.cantidad} onChange={(e) => setIngreso({ ...ingreso, cantidad: e.target.value.replace(/\D/g, "") })} className={INPUT} />
            </Campo>
            {producto.controlaVencimiento && (
              <>
                <Campo etiqueta="Lote (opcional)">
                  <input value={ingreso.lote} onChange={(e) => setIngreso({ ...ingreso, lote: e.target.value })} className={INPUT} />
                </Campo>
                <Campo etiqueta="Vencimiento">
                  <input required type="date" value={ingreso.vencimiento} onChange={(e) => setIngreso({ ...ingreso, vencimiento: e.target.value })} className={INPUT} />
                </Campo>
              </>
            )}
          </div>
          <Campo etiqueta="Detalle (opcional: proveedor, factura)">
            <input value={ingreso.motivo} onChange={(e) => setIngreso({ ...ingreso, motivo: e.target.value })} className={INPUT} />
          </Campo>
          <div className="flex gap-2">
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Registrar ingreso</button>
            <button type="button" onClick={() => setIngreso(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {ajuste && (
        <form onSubmit={guardarAjuste} className="flex flex-col gap-3 rounded-xl border border-humo-200 bg-white p-4">
          <p className="font-medium text-humo-900">Ajuste de stock</p>
          <p className="text-xs text-humo-500">Para roturas, vencidos, muestras o corregir después de contar la estantería. Queda registrado con el motivo.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Tipo">
              <select value={ajuste.signo} onChange={(e) => setAjuste({ ...ajuste, signo: e.target.value as "+" | "-" })} className={INPUT}>
                <option value="-">Restar (sale del stock)</option>
                <option value="+">Sumar (aparece mercadería)</option>
              </select>
            </Campo>
            <Campo etiqueta="Cantidad">
              <input required autoFocus inputMode="numeric" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value.replace(/\D/g, "") })} className={INPUT} />
            </Campo>
            {producto.controlaVencimiento && (
              <Campo etiqueta="Lote">
                <select value={ajuste.loteId} onChange={(e) => setAjuste({ ...ajuste, loteId: e.target.value })} className={INPUT}>
                  <option value="">Sin lote</option>
                  {producto.lotes
                    .filter((l) => !l.generico)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {nombreLote(l)} ({l.cantidad} u.)
                      </option>
                    ))}
                </select>
              </Campo>
            )}
          </div>
          <Campo etiqueta="Motivo (obligatorio)">
            <input required value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} placeholder="Ej: vencido, roto, conteo de estantería" className={INPUT} />
          </Campo>
          <div className="flex gap-2">
            <button className="btn-primary rounded-lg px-4 py-2 text-sm">Registrar ajuste</button>
            <button type="button" onClick={() => setAjuste(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {producto.controlaVencimiento && lotesVisibles.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-humo-900">Lotes</h2>
          <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
            {lotesVisibles.map((l) => (
              <li key={l.id} className="flex justify-between px-4 py-2">
                <span>{nombreLote(l)}</span>
                <span className={`tabular-nums ${l.cantidad < 0 ? "text-peligro-600" : ""}`}>{l.cantidad} u.</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-humo-900">Movimientos</h2>
        {producto.movimientos.length === 0 ? (
          <p className="text-sm text-humo-500">Sin movimientos todavía.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-humo-100 rounded-xl border border-humo-100 bg-white text-sm">
            {producto.movimientos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2">
                <span>
                  {new Date(m.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" })} ·{" "}
                  <strong>{TIPO[m.tipo]}</strong>
                  {m.ventaItem && ` N° ${m.ventaItem.venta.numero}`}
                  {producto.controlaVencimiento && <span className="text-humo-400"> · {nombreLote(m.lote)}</span>}
                  {m.motivo && <span className="text-humo-500"> · {m.motivo}</span>}
                  <span className="text-humo-400"> · {m.usuario}</span>
                </span>
                <span className={`font-medium tabular-nums ${m.cantidad < 0 ? "text-peligro-600" : "text-exito-600"}`}>
                  {m.cantidad > 0 ? "+" : ""}
                  {m.cantidad}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
