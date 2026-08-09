# PlantGuard AI Backend (FastAPI + MongoDB)

## 1) Prerequisites
- Python 3.10+
- MongoDB Atlas (or local MongoDB)
- Existing Next.js frontend in `Frontend/`

## 2) Create virtual environment (Windows)
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

## 3) Install dependencies
```powershell
pip install -r requirements.txt
```

## 4) MongoDB setup
1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Allow your IP in Network Access.
4. Copy the connection string.
5. Put it in `.env` as `MONGODB_URI`.

## 5) Configure environment
Copy `.env.example` to `.env` and set values:
- `MONGODB_URI`
- `JWT_SECRET_KEY` (long random value)
- `MODEL_PATH` (path relative to `backend/`)
- Optional CORS/cookie settings

## 6) Add trained model
- Place your trained model at:
  - `backend/model/plant_disease_model.keras` (recommended), or
  - `backend/model/plant_disease_model.h5`
- Update `MODEL_PATH` in `.env` if needed.
- Ensure class order in `backend/models/class_names.json` matches training.

## 7) Run FastAPI
```powershell
uvicorn app.main:app --reload --port 8000
```

## 8) Run Next.js frontend
In a separate terminal:
```powershell
cd Frontend
npm install
npm run dev
```

Create `Frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 9) API endpoints
- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /ml/predict` (auth required)
- `GET /ml/history` (auth required)
- `GET /user/profile` (auth required)

## 10) Example auth requests
### Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "name": "Alex Farmer",
  "email": "alex@example.com",
  "password": "password123"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "alex@example.com",
  "password": "password123"
}
```

## 11) Example prediction request
```powershell
curl -X POST "http://localhost:8000/ml/predict" `
  -H "Authorization: Bearer <token>" `
  -F "file=@C:\path\to\leaf.jpg"
```

## 12) Troubleshooting
- **`Model file not found`**: Verify `MODEL_PATH` and model filename.
- **Class mismatch error**: Update `models/class_names.json` to exact training class order.
- **401 Unauthorized**: Re-login to refresh JWT.
- **422 validation error**: Check JSON structure and field formats.
- **MongoDB connection issue**: Verify URI, DB user, and Atlas IP allowlist.

## Notes
- Passwords are hashed with bcrypt; plaintext passwords are never stored.
- JWT secret is only used on backend.
- If model file is large, prefer Git LFS instead of committing directly:
  ```powershell
  git lfs install
  git lfs track "*.keras" "*.h5"
  ```

