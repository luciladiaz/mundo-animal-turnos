"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatearPesos } from "@/lib/plata";
import { Campo, INPUT, INPUT_CHICO, InputPlata, MensajeError, aCentavos, centavosATexto } from "@/components/ui/Campos";

interface ResultadoProducto {
  id: string;
  nombre: string;
  precioVenta: number;
  stock: number;
  categoria: { nombre: string };
}
interface ResultadoServicio {
  id: string;
  nombre: string;
  precio: number | null;
}
interface Linea {
  clave: string;
  productoId?: string;
  servicioId?: string;
  descripcion: string;
  detalle: string;
  stock?: number;
  cantidad: number;
  precioLista: number | null;
  precioTexto: string; // lo que está escrito en el campo de precio
}
interface Medio {
  id: string;
  nombre: string;
}
interface Pago {
  clave: string;
  medioPagoId: string;
  montoTexto: string;
}
interface ClienteBuscado {
  id: string;
  nombre: string;
  telefono: string;
}

let contador = 0;
const nuevaClave = () => `l${++contador}`;

export default function NuevaVenta() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<{ productos: ResultadoProducto[]; servicios: ResultadoServicio[] }>({ productos: [], servicios: [] });
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [medios, setMedios] = useState<Medio[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cliente, setCliente] = useState<ClienteBuscado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteBuscado[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const [rm, rc] = await Promise.all([fetch("/api/medios-pago"), fetch("/api/caja")]);
      const m: Medio[] = (await rm.json()).medios ?? [];
      setMedios(m);
      setPagos([{ clave: nuevaClave(), medioPagoId: m[0]?.id ?? "", montoTexto: "" }]);
      setCajaAbierta(Boolean((await rc.json()).caja));
    })();
  }, []);

  // Buscador de productos y servicios (espera un instante entre teclas).
  useEffect(() => {
    if (!busqueda.trim()) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/catalogo-venta?q=${encodeURIComponent(busqueda)}`);
      const data = await res.json();
      if (!cancelado) setResultados({ productos: data.productos ?? [], servicios: data.servicios ?? [] });
    }, 200);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda]);

  useEffect(() => {
    if (!busquedaCliente.trim()) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(busquedaCliente)}`);
      const data = await res.json();
      if (!cancelado) setClientesEncontrados((data.clientes ?? []).slice(0, 6));
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busquedaCliente]);

  function agregarProducto(p: ResultadoProducto) {
    setLineas((ls) => {
      const existente = ls.find((l) => l.productoId === p.id);
      if (existente) return ls.map((l) => (l === existente ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [
        ...ls,
        {
          clave: nuevaClave(),
          productoId: p.id,
          descripcion: p.nombre,
          detalle: p.categoria.nombre,
          stock: p.stock,
          cantidad: 1,
          precioLista: p.precioVenta,
          precioTexto: centavosATexto(p.precioVenta),
        },
      ];
    });
    setBusqueda("");
    setResultados({ productos: [], servicios: [] });
  }

  function agregarServicio(s: ResultadoServicio) {
    setLineas((ls) => [
      ...ls,
      {
        clave: nuevaClave(),
        servicioId: s.id,
        descripcion: s.nombre,
        detalle: "Servicio",
        cantidad: 1,
        precioLista: s.precio,
        precioTexto: s.precio != null ? centavosATexto(s.precio) : "",
      },
    ]);
    setBusqueda("");
    setResultados({ productos: [], servicios: [] });
  }

  function cambiarLinea(clave: string, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  const precioDe = (l: Linea) => aCentavos(l.precioTexto);
  const total = lineas.reduce((a, l) => a + (precioDe(l) ?? 0) * l.cantidad, 0);
  const pagado = pagos.reduce((a, p) => a + (aCentavos(p.montoTexto) ?? 0), 0);
  const falta = total - pagado;

  function completarResto(clave: string) {
    const otros = pagos.filter((p) => p.clave !== clave).reduce((a, p) => a + (aCentavos(p.montoTexto) ?? 0), 0);
    const resto = Math.max(0, total - otros);
    setPagos((ps) => ps.map((p) => (p.clave === clave ? { ...p, montoTexto: centavosATexto(resto) } : p)));
  }

  async function confirmar() {
    setError(null);
    if (lineas.length === 0) return setError("Agregá al menos un producto o servicio");
    for (const l of lineas) {
      const precio = precioDe(l);
      if (precio == null || precio < 0) return setError(`Revisá el precio de "${l.descripcion}"`);
      if (!Number.isInteger(l.cantidad) || l.cantidad < 1) return setError(`Revisá la cantidad de "${l.descripcion}"`);
    }
    const pagosValidos = [];
    for (const p of pagos) {
      if (!p.montoTexto.trim()) continue;
      const monto = aCentavos(p.montoTexto);
      if (monto == null || monto <= 0) return setError("Revisá los montos de los pagos");
      pagosValidos.push({ medioPagoId: p.medioPagoId, monto });
    }
    if (falta < 0) return setError("Los pagos suman más que el total");
    if (falta > 0 && !cliente) return setError("Falta cobrar una parte: elegí el cliente para dejarla en su cuenta corriente");

    setEnviando(true);
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lineas.map((l) => ({
          productoId: l.productoId ?? null,
          servicioId: l.servicioId ?? null,
          cantidad: l.cantidad,
          precioUnitario: precioDe(l),
        })),
        pagos: pagosValidos,
        tutorId: cliente?.id ?? null,
        observaciones: observaciones || null,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo registrar la venta");
    router.push(`/admin/ventas?ok=${encodeURIComponent(`Venta N° ${data.venta.numero} registrada por ${formatearPesos(data.venta.total)}`)}`);
    router.refresh();
  }

  if (cajaAbierta === false) {
    return (
      <div className="rounded-xl border border-humo-100 bg-white p-5 text-sm">
        <p className="font-medium text-humo-900">La caja está cerrada.</p>
        <p className="text-humo-500">Para vender, primero abrí la caja del día.</p>
        <Link href="/admin/ventas" className="mt-2 inline-block font-medium text-[var(--color-primario)] hover:underline">
          Ir a abrir la caja →
        </Link>
      </div>
    );
  }

  const hayResultados = resultados.productos.length > 0 || resultados.servicios.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Qué se vende */}
      <section className="flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
        <p className="font-medium text-humo-900">1. ¿Qué se vende?</p>
        <div className="relative">
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              if (!e.target.value.trim()) setResultados({ productos: [], servicios: [] });
            }}
            placeholder="Buscá un producto o servicio por nombre..."
            className={INPUT}
          />
          {busqueda.trim() && hayResultados && (
            <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-humo-200 bg-white shadow-lg">
              {resultados.servicios.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => agregarServicio(s)} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-mora-50">
                    <span>
                      {s.nombre} <span className="text-xs text-humo-400">· servicio</span>
                    </span>
                    <span className="tabular-nums text-humo-600">{s.precio != null ? formatearPesos(s.precio) : "sin precio"}</span>
                  </button>
                </li>
              ))}
              {resultados.productos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => agregarProducto(p)} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-mora-50">
                    <span>
                      {p.nombre} <span className="text-xs text-humo-400">· {p.categoria.nombre}</span>
                      <span className={`ml-1 text-xs ${p.stock <= 0 ? "text-peligro-600" : "text-humo-400"}`}>(stock {p.stock})</span>
                    </span>
                    <span className="tabular-nums text-humo-600">{formatearPesos(p.precioVenta)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busqueda.trim() && !hayResultados && <p className="mt-1 text-xs text-humo-400">Sin resultados para “{busqueda}”.</p>}
        </div>

        {lineas.length > 0 && (
          <ul className="flex flex-col divide-y divide-humo-100">
            {lineas.map((l) => {
              const precio = precioDe(l);
              const modificado = precio != null && l.precioLista != null && precio !== l.precioLista;
              return (
                <li key={l.clave} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <div className="min-w-40 flex-1">
                    <p className="font-medium text-humo-900">{l.descripcion}</p>
                    <p className="text-xs text-humo-400">
                      {l.detalle}
                      {l.stock != null && (
                        <span className={l.stock - l.cantidad < 0 ? " text-alerta-600" : ""}>
                          {" "}
                          · stock {l.stock}
                          {l.stock - l.cantidad < 0 && " (va a quedar negativo)"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => cambiarLinea(l.clave, { cantidad: Math.max(1, l.cantidad - 1) })} className="btn-secondary h-8 w-8 rounded-md">
                      −
                    </button>
                    <input
                      inputMode="numeric"
                      value={l.cantidad}
                      onChange={(e) => cambiarLinea(l.clave, { cantidad: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
                      className="h-8 w-12 rounded-md border border-humo-200 text-center tabular-nums"
                      aria-label="Cantidad"
                    />
                    <button type="button" onClick={() => cambiarLinea(l.clave, { cantidad: l.cantidad + 1 })} className="btn-secondary h-8 w-8 rounded-md">
                      +
                    </button>
                  </div>
                  <div className="w-32">
                    <InputPlata texto={l.precioTexto} onChange={(t) => cambiarLinea(l.clave, { precioTexto: t })} ariaLabel="Precio unitario" className="py-1.5" />
                    {modificado && <p className="text-[11px] text-alerta-600">Lista: {formatearPesos(l.precioLista!)}</p>}
                  </div>
                  <p className="w-24 text-right font-medium tabular-nums">{formatearPesos((precio ?? 0) * l.cantidad)}</p>
                  <button type="button" onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))} className="text-xs text-peligro-600 hover:underline">
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-right font-display text-xl font-semibold tabular-nums text-humo-900">Total {formatearPesos(total)}</p>
      </section>

      {/* 2. Cliente */}
      <section className="flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
        <p className="font-medium text-humo-900">
          2. Cliente <span className="font-normal text-humo-400">(opcional; obligatorio si queda algo en cuenta corriente)</span>
        </p>
        {cliente ? (
          <p className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-mora-50 px-3 py-1 text-mora-700">
              {cliente.nombre} · {cliente.telefono}
            </span>
            <button type="button" onClick={() => setCliente(null)} className="text-xs text-humo-500 hover:text-humo-800">
              Quitar
            </button>
          </p>
        ) : (
          <div className="relative">
            <input
              value={busquedaCliente}
              onChange={(e) => {
                setBusquedaCliente(e.target.value);
                if (!e.target.value.trim()) setClientesEncontrados([]);
              }}
              placeholder="Consumidor final — o buscá un cliente por nombre o teléfono"
              className={INPUT}
            />
            {busquedaCliente.trim() && clientesEncontrados.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-humo-200 bg-white shadow-lg">
                {clientesEncontrados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCliente(c);
                        setBusquedaCliente("");
                        setClientesEncontrados([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-mora-50"
                    >
                      {c.nombre} <span className="text-xs text-humo-400">· {c.telefono}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 3. Pago */}
      <section className="flex flex-col gap-2 rounded-xl border border-humo-100 bg-white p-4">
        <p className="font-medium text-humo-900">3. Pago</p>
        {pagos.map((p) => (
          <div key={p.clave} className="flex flex-wrap items-center gap-2">
            <select
              value={p.medioPagoId}
              onChange={(e) => setPagos((ps) => ps.map((x) => (x.clave === p.clave ? { ...x, medioPagoId: e.target.value } : x)))}
              className={`${INPUT_CHICO} w-44`}
              aria-label="Medio de pago"
            >
              {medios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <div className="w-40">
              <InputPlata texto={p.montoTexto} onChange={(t) => setPagos((ps) => ps.map((x) => (x.clave === p.clave ? { ...x, montoTexto: t } : x)))} ariaLabel="Monto" />
            </div>
            <button type="button" onClick={() => completarResto(p.clave)} className="text-xs font-medium text-[var(--color-primario)] hover:underline">
              Completar con el resto
            </button>
            {pagos.length > 1 && (
              <button type="button" onClick={() => setPagos((ps) => ps.filter((x) => x.clave !== p.clave))} className="text-xs text-peligro-600 hover:underline">
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPagos((ps) => [...ps, { clave: nuevaClave(), medioPagoId: medios[0]?.id ?? "", montoTexto: "" }])}
          className="btn-secondary w-fit rounded-md px-3 py-1.5 text-xs font-medium"
        >
          + Pagar con otro medio
        </button>
        <div className="mt-1 flex flex-col items-end gap-0.5 text-sm tabular-nums">
          <p className="text-humo-600">Pagado: {formatearPesos(pagado)}</p>
          {falta > 0 && (
            <p className="font-medium text-alerta-600">
              Falta {formatearPesos(falta)}
              {cliente ? ` → queda en la cuenta corriente de ${cliente.nombre}` : " (elegí un cliente para dejarlo en cuenta corriente)"}
            </p>
          )}
          {falta < 0 && <p className="font-medium text-peligro-600">Los pagos superan el total por {formatearPesos(-falta)}</p>}
        </div>
      </section>

      <Campo etiqueta="Observaciones (opcional)">
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={INPUT} />
      </Campo>

      <MensajeError error={error} />
      <div className="flex gap-2">
        <button onClick={confirmar} disabled={enviando || lineas.length === 0} className="btn-primary rounded-lg px-6 py-3 text-sm disabled:opacity-50">
          {enviando ? "Registrando..." : `Confirmar venta · ${formatearPesos(total)}`}
        </button>
        <Link href="/admin/ventas" className="btn-secondary rounded-lg px-4 py-3 text-sm font-medium">
          Cancelar
        </Link>
      </div>
    </div>
  );
}
