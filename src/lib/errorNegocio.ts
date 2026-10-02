import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/** Error con un mensaje pensado para mostrarle al usuario (stock, caja, ventas). */
export class ErrorNegocio extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/** Convierte cualquier error de las operaciones de ventas/caja/stock en una respuesta clara. */
export function respuestaDeError(err: unknown) {
  if (err instanceof ErrorNegocio) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    // Índice único: en la práctica, intentar abrir una segunda caja a la vez.
    return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ error: "No se pudo completar la operación, intentá de nuevo" }, { status: 500 });
}
