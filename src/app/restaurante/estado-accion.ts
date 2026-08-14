/**
 * Estado compartido entre las server actions y el formulario cliente.
 *
 * Vive aparte de actions.ts porque un archivo "use server" solo puede exportar
 * funciones async: exportar la constante desde ahí rompe el build.
 */
export interface EstadoAccion {
  ok: boolean;
  mensaje?: string;
}

export const ESTADO_INICIAL: EstadoAccion = { ok: true };
