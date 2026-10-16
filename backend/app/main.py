from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.api.routes import router
from app.core.config import get_settings
from app.core.database import engine

settings = get_settings()
app = FastAPI(title='CareNexus Hospital API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PATCH', 'DELETE'], allow_headers=['Content-Type', 'X-CSRF-Token'])
app.include_router(router)


@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response


@app.exception_handler(IntegrityError)
async def constraint_error(request, exc):
    return JSONResponse(status_code=409, content={'detail': 'This operation conflicts with an existing record.'})


@app.get('/health')
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return {'status': 'ok', 'database': engine.dialect.name, 'ai_mode': settings.ai_mode}
    except Exception:
        return JSONResponse(status_code=503, content={'status': 'unavailable', 'detail': 'Database connection unavailable.'})
