from fastapi import APIRouter, Query

from app.modules.integrations import zipterior_client
from app.modules.integrations.schemas import ZipteriorMapMarkerListOut, ZipteriorPortfolioListOut

router = APIRouter(prefix="/integrations/zipterior", tags=["integrations"])


@router.get("/portfolios", response_model=ZipteriorPortfolioListOut)
def get_portfolios_for_complex_type(
    complex_id: int = Query(..., ge=1),
    apartment_type_id: int | None = Query(None, ge=1),
    limit: int = Query(6, ge=1, le=20),
) -> ZipteriorPortfolioListOut:
    return zipterior_client.get_portfolios_for_complex_type(
        complex_id=complex_id, apartment_type_id=apartment_type_id, limit=limit
    )


@router.get("/map-markers", response_model=ZipteriorMapMarkerListOut)
def get_interior_map_markers(
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    sido: str | None = None,
    sigungu: str | None = None,
    limit: int = Query(1000, ge=1, le=3000),
) -> ZipteriorMapMarkerListOut:
    return zipterior_client.get_interior_map_markers(
        north=north, south=south, east=east, west=west, sido=sido, sigungu=sigungu, limit=limit
    )
