from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.modules.apartments.router import router as apartments_router
from app.modules.auth.router import router as auth_router
from app.modules.companies.router import router as companies_router
from app.modules.double_benefit.router import router as double_benefit_router
from app.modules.integrations.router import router as integrations_router
from app.modules.lifestyle.router import router as lifestyle_router
from app.modules.listings.router import router as listings_router
from app.modules.payments.router import router as payments_router
from app.modules.purchase_requests.router import router as purchase_requests_router

settings = get_settings()

app = FastAPI(title="집팔고360 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(apartments_router, prefix="/api")
app.include_router(listings_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(double_benefit_router, prefix="/api")
app.include_router(purchase_requests_router, prefix="/api")
app.include_router(lifestyle_router, prefix="/api")
app.include_router(integrations_router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
