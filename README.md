# ManageD


## Getting Started

**Requirements:** .NET 10, Node 24

Backend and frontent must be run simultaneously in separate terminals.

### Setup

```bash
cd backend
dotnet restore

cd frontend
npm install
```

### Running

**Backend:**

```bash
cd backend
dotnet run
```

**Frontend:**

```bash
cd frontend
npm run dev
```

Frontend runs on `localhost:5173`. The proxy in `frontend/vite.config.ts`
forwards `/api/*` requests to the .NET backend on `localhost:5001`.
