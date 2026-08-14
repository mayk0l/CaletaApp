# CaletaApp 🦈
**Trazabilidad + venta directa para pesca artesanal de Valparaíso**

Ocean Lab Hackathon 2026 · LimacheWaves

## Quick start

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # editar keys si necesario
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

## Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind → Vercel
- **Backend**: FastAPI + SQLite → Railway
- **IA**: Gemini API (visión + voz, $0) + INACAP API (qwen3-32b RAG, $0)

## Flujo
```
Captura (voz/manual/foto) → IA extrae datos → Formulario SERNAPESCA autollenado
→ Validación → Envío mock → Publicación marketplace → Precio dinámico + RAG
→ Matching con restaurantes
```

## Equipo
Joaquín Rubio · Maykol · Manuel · Pía · Matías
