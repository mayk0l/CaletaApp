const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// Capturas
export const capturaVoz = (audio_text: string) =>
  fetchAPI<{ id: number; especie: string; peso_kg: number; estado: string }>("/api/capturas/voz", {
    method: "POST", body: JSON.stringify({ audio_text }),
  });

export const capturaManual = (data: { pescador_id: number; especie: string; peso_kg: number; largo_cm?: number }) =>
  fetchAPI<{ id: number; especie: string; peso_kg: number; estado: string }>("/api/capturas/manual", {
    method: "POST", body: JSON.stringify(data),
  });

// Formulario
export const getFormulario = (captura_id: number) =>
  fetchAPI<{ id: number; captura_id: number; campos: Record<string, any>; estado_envio: string }>(`/api/formulario/${captura_id}`);

export const validarFormulario = (captura_id: number) =>
  fetchAPI(`/api/formulario/${captura_id}/validar`, { method: "POST" });

export const enviarFormulario = (captura_id: number) =>
  fetchAPI(`/api/formulario/${captura_id}/enviar`, { method: "POST" });

// Marketplace
export interface Producto {
  id: number; captura_id: number; especie: string; cantidad: number;
  precio_inicial: number; precio_actual: number;
  timestamp_publicacion: string; ultima_actualizacion: string; estado: string;
}

export const getMarketplace = () => fetchAPI<Producto[]>("/api/marketplace");

export const actualizarPrecio = (producto_id: number) =>
  fetchAPI<Producto>(`/api/marketplace/${producto_id}/actualizar-precio`, { method: "POST" });

export const getPrediccion = (producto_id: number) =>
  fetchAPI<{ precio_sugerido: number; tendencia: string; justificacion: string }>(`/api/marketplace/${producto_id}/prediccion`);

// Pedidos
export const crearPedido = (data: { restaurante_id: number; especie_solicitada: string; cantidad: number }) =>
  fetchAPI<{ id: number; estado: string }>("/api/pedidos", {
    method: "POST", body: JSON.stringify(data),
  });

export const matchPedido = (pedido_id: number) =>
  fetchAPI<{ producto_id: number; especie: string; cantidad: number; precio_actual: number; frescura_horas: number; score: number }[]>(`/api/pedidos/match/${pedido_id}`);

// Misc
export const getPescadores = () => fetchAPI<{ id: number; nombre: string; caleta: string }[]>("/api/pescadores");
export const getRestaurantes = () => fetchAPI<{ id: number; nombre: string; sello_certificado: boolean }[]>("/api/restaurantes");
