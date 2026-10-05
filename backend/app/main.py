from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import close_mongo_connection, connect_to_mongo, is_connected
from app.routes.auth_route import router as auth_router
from app.routes.ml_route import router as ml_router
from app.routes.user_route import router as user_router
from app.routes.weather_route import router as weather_router
from app.services import model_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_mongo()
    model_service.load_model_once()
    yield
    await close_mongo_connection()


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else None
    message = first_error.get("msg", "Validation error.") if first_error else "Validation error."
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"success": False, "message": message})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"success": False, "message": "Internal server error."})


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "database": "connected" if is_connected() else "disconnected",
        "model_loaded": model_service.is_loaded(),
        "model": "loaded" if model_service.is_loaded() else "not_loaded",
    }


app.include_router(auth_router)
app.include_router(ml_router)
app.include_router(user_router)
app.include_router(weather_router)
