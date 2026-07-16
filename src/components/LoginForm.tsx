"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setCargando(false);
    if (res?.error) {
      setError("Usuario o contraseña incorrectos");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {error && <p className="rounded-xl bg-peligro-50 px-3 py-2 text-sm text-peligro-600">{error}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-humo-600">Nombre de usuario</span>
        <input
          type="text"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-humo-600">Contraseña</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-humo-200 px-3 py-2 outline-none transition focus:border-[var(--color-primario)] focus:ring-2 focus:ring-mora-100"
        />
      </label>
      <button
        type="submit"
        disabled={cargando}
        className="btn-primary mt-2 rounded-xl px-4 py-2.5 font-semibold"
      >
        {cargando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
