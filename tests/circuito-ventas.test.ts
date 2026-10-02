/**
 * Pruebas del circuito completo de ventas, caja y stock contra un Postgres REAL de
 * pruebas (necesario para probar ventas simultáneas y bloqueos).
 *
 *   TEST_DATABASE_URL="postgresql://postgres:prueba@localhost:54329/pruebas" npm run test:ventas
 *
 * La base tiene que tener todas las migraciones aplicadas. Se niega a correr contra
 * cualquier base que no sea local: BORRA los datos de ventas, caja y stock.
 */
import { PrismaClient } from "@prisma/client";
import { abrirCaja, cerrarCaja, esperadoPorMedio, registrarMovimientoManual } from "../src/lib/caja";
import { anularVenta, cobrarCuentaCorriente, crearVenta, saldoCuentaCorriente } from "../src/lib/ventas";
import { ajustarStock, controlarCoherencia, ingresarStock } from "../src/lib/stock";
import { ErrorNegocio } from "../src/lib/errorNegocio";

const url = process.env.TEST_DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("TEST_DATABASE_URL tiene que apuntar a un Postgres LOCAL de pruebas. No se corre contra la base real.");
  process.exit(1);
}
const db = new PrismaClient({ datasourceUrl: url });
const U = "Pruebas";

let fallas = 0;
let pasadas = 0;
function ok(condicion: unknown, descripcion: string) {
  if (condicion) {
    pasadas++;
    console.log(`  ✓ ${descripcion}`);
  } else {
    fallas++;
    console.log(`  ✗ ${descripcion}`);
  }
}
async function falla(promesa: Promise<unknown>, contiene: string, descripcion: string) {
  try {
    await promesa;
    ok(false, `${descripcion} (no dio error)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(e instanceof ErrorNegocio && msg.includes(contiene), `${descripcion} → "${msg}"`);
  }
}
const stock = async (id: string) => (await db.producto.findUniqueOrThrow({ where: { id } })).stock;
const lote = async (id: string) => (await db.loteStock.findUniqueOrThrow({ where: { id } })).cantidad;

async function main() {
  console.log("Preparando datos de prueba...");
  await db.$executeRawUnsafe(
    `TRUNCATE "MovimientoCaja","CajaConteo","PagoCuentaCorriente","VentaPago","MovimientoStock","VentaItem","Venta","Caja","LoteStock","Producto" CASCADE`
  );
  const medios = await db.medioPago.findMany();
  const efectivo = medios.find((m) => m.esEfectivo)!;
  const debito = medios.find((m) => m.nombre === "Débito")!;
  const qr = medios.find((m) => m.nombre === "QR")!;
  const categoria = await db.categoriaProducto.findFirstOrThrow({ where: { nombre: "Medicamentos" } });
  const servicio = await db.servicio.create({ data: { nombre: "Consulta prueba", precio: 5000 } });
  const tutor = await db.tutor.create({ data: { nombre: "Cliente Prueba", telefono: "2990000000", telefonoClave: `p${Date.now()}`.slice(-10) } });

  const A = await db.producto.create({ data: { nombre: "Collar", nombreClave: "collar", categoriaId: categoria.id, precioVenta: 150000 } });
  const B = await db.producto.create({
    data: { nombre: "Antibiótico", nombreClave: "antibiotico", categoriaId: categoria.id, precioVenta: 320000, controlaVencimiento: true },
  });
  await db.$transaction((tx) => ingresarStock(tx, { productoId: A.id, cantidad: 10, tipo: "INICIAL", usuario: U }));
  await db.$transaction((tx) => ingresarStock(tx, { productoId: B.id, cantidad: 5, tipo: "INICIAL", usuario: U, codigoLote: "L2", vencimiento: "2027-06-30" }));
  await db.$transaction((tx) => ingresarStock(tx, { productoId: B.id, cantidad: 3, tipo: "INICIAL", usuario: U, codigoLote: "L1", vencimiento: "2026-12-31" }));
  const L1 = await db.loteStock.findFirstOrThrow({ where: { productoId: B.id, codigo: "L1" } });
  const L2 = await db.loteStock.findFirstOrThrow({ where: { productoId: B.id, codigo: "L2" } });

  console.log("\n1. Stock inicial");
  ok((await stock(A.id)) === 10, "Collar: 10 unidades");
  ok((await stock(B.id)) === 8 && (await lote(L1.id)) === 3 && (await lote(L2.id)) === 5, "Antibiótico: 8 (lote L1 = 3, lote L2 = 5)");
  await falla(
    db.$transaction((tx) => ingresarStock(tx, { productoId: B.id, cantidad: 2, tipo: "COMPRA", usuario: U })),
    "vencimiento",
    "Producto con vencimiento sin fecha: rechazado"
  );

  console.log("\n2. Caja");
  await falla(
    crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 150000 }] }, U),
    "caja está cerrada",
    "No se puede vender con la caja cerrada"
  );
  const resultadosApertura = await Promise.allSettled([
    abrirCaja(db, { efectivoInicial: 1000000, usuario: U }),
    abrirCaja(db, { efectivoInicial: 1000000, usuario: U }),
  ]);
  ok(resultadosApertura.filter((r) => r.status === "fulfilled").length === 1, "Dos aperturas al mismo tiempo: solo se abre UNA caja");
  const caja1 = await db.caja.findFirstOrThrow({ where: { estado: "ABIERTA" } });

  console.log("\n3. Ventas");
  const v1 = await crearVenta(
    db,
    {
      items: [
        { productoId: A.id, cantidad: 2 },
        { servicioId: servicio.id, cantidad: 1 },
      ],
      pagos: [{ medioPagoId: efectivo.id, monto: 300000 + 500000 }],
    },
    U
  );
  ok(v1.total === 800000 && v1.pagado === 800000, "Venta 1: 2 collares + consulta = $ 8.000, pagada en efectivo");
  ok((await stock(A.id)) === 8, "Collar baja a 8");

  const v2 = await crearVenta(
    db,
    {
      items: [{ productoId: B.id, cantidad: 4 }],
      pagos: [
        { medioPagoId: debito.id, monto: 1000000 },
        { medioPagoId: qr.id, monto: 280000 },
      ],
    },
    U
  );
  ok((await lote(L1.id)) === 0 && (await lote(L2.id)) === 4, "Venta 2: sale primero el lote que vence antes (L1 3 → 0, L2 5 → 4)");
  ok(v2.pagado === 1280000, "Venta 2 pagada con dos medios (débito + QR)");

  await crearVenta(db, { items: [{ productoId: A.id, cantidad: 10 }], pagos: [{ medioPagoId: efectivo.id, monto: 1500000 }] }, U);
  ok((await stock(A.id)) === -2, "Venta 3: 10 collares con 8 en stock → se vende igual y queda en -2");

  const v4 = await crearVenta(
    db,
    { items: [{ productoId: A.id, cantidad: 1, precioUnitario: 120000 }], pagos: [{ medioPagoId: efectivo.id, monto: 120000 }] },
    U
  );
  const item4 = await db.ventaItem.findFirstOrThrow({ where: { ventaId: v4.id } });
  ok(item4.precioLista === 150000 && item4.precioUnitario === 120000 && v4.total === 120000, "Venta con descuento: queda el precio de lista y el cobrado");

  await falla(
    crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 50000 }] }, U),
    "cuenta corriente",
    "Pago parcial sin cliente: rechazado"
  );
  await falla(
    crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 999999 }] }, U),
    "más que el total",
    "Pagos mayores al total: rechazado"
  );
  const stockAntesDeError = await stock(A.id);
  ok(stockAntesDeError === -3, "Las ventas rechazadas no tocaron el stock (sigue en -3)");

  const v5 = await crearVenta(
    db,
    { items: [{ productoId: A.id, cantidad: 2 }], pagos: [{ medioPagoId: efectivo.id, monto: 100000 }], tutorId: tutor.id },
    U
  );
  ok((await saldoCuentaCorriente(db, tutor.id)) === 200000, "Venta 5: paga $ 1.000 de $ 3.000 → debe $ 2.000 en cuenta corriente");
  ok(v5.pagado === 100000, "En la caja entra solo lo pagado");

  console.log("\n4. Ventas simultáneas");
  const antesB = await stock(B.id);
  await Promise.all(
    Array.from({ length: 2 }, () =>
      crearVenta(db, { items: [{ productoId: B.id, cantidad: 3 }], pagos: [{ medioPagoId: efectivo.id, monto: 960000 }] }, U)
    )
  );
  ok((await stock(B.id)) === antesB - 6, `Dos ventas de 3 antibióticos a la vez: ${antesB} → ${antesB - 6}, sin perder ninguna`);
  const antesA = await stock(A.id);
  const veinte = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 150000 }] }, U)
    )
  );
  const exitosas = veinte.filter((r) => r.status === "fulfilled").length;
  ok(exitosas === 20 && (await stock(A.id)) === antesA - 20, `20 ventas simultáneas de un collar: las 20 se registran y el stock baja exactamente 20`);

  console.log("\n5. Anulaciones");
  const l1Antes = await lote(L1.id);
  const l2Antes = await lote(L2.id);
  await falla(anularVenta(db, { ventaId: v2.id, motivo: "  " }, U), "motivo", "Anular sin motivo: rechazado");
  await anularVenta(db, { ventaId: v2.id, motivo: "Se cargó mal" }, U);
  ok((await lote(L1.id)) === l1Antes + 3 && (await lote(L2.id)) === l2Antes + 1, "Anular venta 2: vuelve a los mismos lotes (L1 +3, L2 +1)");
  await falla(anularVenta(db, { ventaId: v2.id, motivo: "otra vez" }, U), "ya estaba anulada", "Anular dos veces: rechazado");
  const devoluciones = await db.movimientoCaja.findMany({ where: { ventaId: v2.id, tipo: "ANULACION_VENTA" } });
  ok(devoluciones.reduce((a, m) => a + m.monto, 0) === -1280000, "La devolución de los pagos queda en la caja (débito y QR)");
  await anularVenta(db, { ventaId: v5.id, motivo: "Prueba" }, U);
  ok((await saldoCuentaCorriente(db, tutor.id)) === 0, "Anular la venta con deuda: el cliente deja de deber");

  console.log("\n6. Ajustes de stock");
  await falla(db.$transaction((tx) => ajustarStock(tx, { productoId: A.id, cantidad: -1, motivo: "", usuario: U })), "motivo", "Ajuste sin motivo: rechazado");
  const antesAjuste = await stock(A.id);
  await db.$transaction((tx) => ajustarStock(tx, { productoId: A.id, cantidad: 5, motivo: "Conteo físico", usuario: U }));
  ok((await stock(A.id)) === antesAjuste + 5, "Ajuste +5 por conteo físico");

  console.log("\n7. Cuenta corriente");
  await crearVenta(
    db,
    { items: [{ servicioId: servicio.id, cantidad: 1 }], pagos: [], tutorId: tutor.id, observaciones: "Fiado" },
    U
  );
  ok((await saldoCuentaCorriente(db, tutor.id)) === 500000, "Consulta fiada entera: debe $ 5.000");
  await falla(cobrarCuentaCorriente(db, { tutorId: tutor.id, medioPagoId: efectivo.id, monto: 600000 }, U), "mayor a lo que debe", "Cobrar más de lo que debe: rechazado");
  await cobrarCuentaCorriente(db, { tutorId: tutor.id, medioPagoId: efectivo.id, monto: 300000 }, U);
  ok((await saldoCuentaCorriente(db, tutor.id)) === 200000, "Paga $ 3.000: queda debiendo $ 2.000");

  console.log("\n8. Gastos, ingresos y retiros");
  await registrarMovimientoManual(db, { tipo: "GASTO", medioPagoId: efectivo.id, monto: 250000, descripcion: "Artículos de limpieza", usuario: U });
  await registrarMovimientoManual(db, { tipo: "RETIRO", medioPagoId: efectivo.id, monto: 500000, descripcion: "Retiro de la dueña", usuario: U });
  await registrarMovimientoManual(db, { tipo: "INGRESO", medioPagoId: efectivo.id, monto: 100000, descripcion: "Cambio", usuario: U });
  await falla(
    registrarMovimientoManual(db, { tipo: "GASTO", medioPagoId: efectivo.id, monto: 0, descripcion: "x", usuario: U }),
    "mayor a 0",
    "Gasto de $ 0: rechazado"
  );

  console.log("\n9. Cierre de caja");
  // Esperado calculado a mano, recorriendo los movimientos uno por uno.
  const movs = await db.movimientoCaja.findMany({ where: { cajaId: caja1.id } });
  const manual = (medioId: string, inicial: number) => inicial + movs.filter((m) => m.medioPagoId === medioId).reduce((a, m) => a + m.monto, 0);
  const resumen = await esperadoPorMedio(db, caja1.id);
  const rEf = resumen.find((r) => r.medioPagoId === efectivo.id)!;
  ok(rEf.esperado === manual(efectivo.id, 1000000), `Efectivo esperado ${rEf.esperado / 100} = inicial + movimientos`);
  ok(resumen.find((r) => r.medioPagoId === debito.id)!.esperado === manual(debito.id, 0), "Débito esperado = movimientos (venta − anulación)");
  await falla(cerrarCaja(db, { conteos: [{ medioPagoId: efectivo.id, contado: rEf.esperado }], usuario: U }), "Falta cargar lo contado", "Cerrar sin contar todos los medios: rechazado");

  // Carrera: una venta que intenta entrar justo mientras se cierra.
  const conteos = resumen.map((r) => ({ medioPagoId: r.medioPagoId, contado: r.medioPagoId === efectivo.id ? r.esperado - 5000 : r.esperado }));
  const [cierre, ventaCarrera] = await Promise.allSettled([
    cerrarCaja(db, { conteos, observaciones: "Faltan $ 50", usuario: U }),
    crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 150000 }] }, U),
  ]);
  if (cierre.status === "fulfilled") {
    const guardados = await db.cajaConteo.findMany({ where: { cajaId: caja1.id } });
    const movsFinal = await db.movimientoCaja.findMany({ where: { cajaId: caja1.id } });
    const coincide = guardados.every((c) => {
      const inicial = c.medioPagoId === efectivo.id ? 1000000 : 0;
      return c.esperado === inicial + movsFinal.filter((m) => m.medioPagoId === c.medioPagoId).reduce((a, m) => a + m.monto, 0);
    });
    ok(coincide, `Venta simultánea al cierre (${ventaCarrera.status === "fulfilled" ? "entró antes" : "rechazada"}): lo esperado guardado coincide con los movimientos`);
    ok(guardados.find((c) => c.medioPagoId === efectivo.id)!.contado - guardados.find((c) => c.medioPagoId === efectivo.id)!.esperado === -5000 ||
      ventaCarrera.status === "fulfilled", "Diferencia de efectivo registrada (-$ 50)");
  } else {
    // Si la venta entró primero, el conteo enviado quedó viejo: se vuelve a cerrar con el resumen nuevo.
    const r2 = await esperadoPorMedio(db, caja1.id);
    await cerrarCaja(db, { conteos: r2.map((r) => ({ medioPagoId: r.medioPagoId, contado: r.esperado })), usuario: U });
    ok(true, "Cierre reintentado con el resumen actualizado");
  }
  ok((await db.caja.findUniqueOrThrow({ where: { id: caja1.id } })).estado === "CERRADA", "Caja 1 cerrada");

  console.log("\n10. Después del cierre");
  await falla(
    crearVenta(db, { items: [{ productoId: A.id, cantidad: 1 }], pagos: [{ medioPagoId: efectivo.id, monto: 150000 }] }, U),
    "caja está cerrada",
    "Vender con la caja cerrada: rechazado"
  );
  await falla(anularVenta(db, { ventaId: v1.id, motivo: "x" }, U), "caja está cerrada", "Anular con la caja cerrada: rechazado");
  const sumaCaja1 = async () => (await db.movimientoCaja.aggregate({ where: { cajaId: caja1.id }, _sum: { monto: true } }))._sum.monto;
  const antesCaja1 = await sumaCaja1();
  const caja2 = await abrirCaja(db, { efectivoInicial: 500000, usuario: U });
  await anularVenta(db, { ventaId: v1.id, motivo: "Devolución del cliente" }, U);
  ok((await sumaCaja1()) === antesCaja1, "Anular una venta de la caja cerrada NO modifica esa caja");
  const enCaja2 = await db.movimientoCaja.findMany({ where: { cajaId: caja2.id, ventaId: v1.id } });
  ok(enCaja2.length === 1 && enCaja2[0].monto === -800000, "La devolución queda en la caja abierta de hoy");

  console.log("\n11. Control de coherencia");
  const control = await controlarCoherencia(db);
  ok(control.lotes.length === 0 && control.productos.length === 0, "Stock guardado = suma de movimientos, en todos los lotes y productos");
  const sumaMovA = (await db.movimientoStock.aggregate({ where: { productoId: A.id }, _sum: { cantidad: true } }))._sum.cantidad;
  ok(sumaMovA === (await stock(A.id)), `Collar: stock ${await stock(A.id)} = suma de sus movimientos`);

  console.log(`\nResultado: ${pasadas} pruebas OK, ${fallas} fallas`);
  await db.$disconnect();
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
