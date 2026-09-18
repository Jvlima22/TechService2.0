# Desenvolvimento local e produção

## Arquitetura

- Frontend React local: `http://localhost:3000`
- API FastAPI local: `http://localhost:8000`
- Produção: `https://techservice-tgl.vercel.app`
- API em produção: `https://techservice-tgl.vercel.app/api`

O cliente HTTP do frontend usa `REACT_APP_BACKEND_URL`. O arquivo `.env.development` aponta para a API local; o arquivo `.env.production` aponta para a URL publicada na Vercel.

## Pré-requisitos locais

Crie `backend/.env` a partir das variáveis do projeto, sem versionar segredos. No mínimo, a API precisa de `MONGO_URL`, `DB_NAME` e `JWT_SECRET`. Para CORS, use:

```env
CORS_ORIGINS=http://localhost:3000,https://techservice-tgl.vercel.app
```

## Iniciar a API

No primeiro terminal, na raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000
```

A API pode ser verificada em:

```text
http://localhost:8000/api/
```

## Iniciar o frontend

No segundo terminal:

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

A aplicação abrirá em:

```text
http://localhost:3000
```

## Produção

O deploy unificado usa a raiz do repositório na Vercel. O frontend é compilado em `frontend/build` e `api/index.py` expõe o FastAPI como função serverless. O cliente de produção usa:

```text
https://techservice-tgl.vercel.app/api
```

Para publicar:

```powershell
vercel --prod
```

As variáveis de ambiente de produção devem ser configuradas no projeto `techservice` da Vercel, especialmente `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS` e as credenciais de e-mail/pagamentos.
