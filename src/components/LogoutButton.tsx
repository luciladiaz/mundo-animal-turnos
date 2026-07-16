"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="btn-secondary rounded-lg px-3 py-1.5 text-sm font-medium"
    >
      Cerrar sesión
    </button>
  );
}
