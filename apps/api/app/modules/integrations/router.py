from fastapi import APIRouter, Query

from app.modules.integrations import zipterior_client
from app.modules.integrations.schemas import (
    ZipteriorCompanyMapMarkerListOut,
    ZipteriorComplexDetailOut,
    ZipteriorComplexPortfolioListOut,
    ZipteriorMapMarkerListOut,
    ZipteriorPortfolioDetailOut,
    ZipteriorPortfolioListOut,
    ZipteriorSearchOut,
    ZipteriorViewportOut,
)

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


@router.get("/company-markers", response_model=ZipteriorCompanyMapMarkerListOut)
def get_interior_companies(
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    limit: int = Query(1000, ge=1, le=3000),
) -> ZipteriorCompanyMapMarkerListOut:
    return zipterior_client.get_interior_companies(north=north, south=south, east=east, west=west, limit=limit)


@router.get("/viewport", response_model=ZipteriorViewportOut)
def get_interior_viewport(
    marker_type: str = Query("complex"),
    zoom: int = Query(..., ge=1, le=20),
    north: float = Query(...),
    south: float = Query(...),
    east: float = Query(...),
    west: float = Query(...),
    has_portfolio: bool = Query(False),
    source_limit: int = Query(3000, ge=1, le=5000),
) -> ZipteriorViewportOut:
    return zipterior_client.get_interior_viewport(
        marker_type=marker_type,
        zoom=zoom,
        north=north,
        south=south,
        east=east,
        west=west,
        has_portfolio=has_portfolio,
        source_limit=source_limit,
    )


@router.get("/complexes/{complex_id}", response_model=ZipteriorComplexDetailOut)
def get_complex_detail(complex_id: int) -> ZipteriorComplexDetailOut:
    return zipterior_client.get_complex_detail(complex_id)


@router.get("/complex-portfolios", response_model=ZipteriorComplexPortfolioListOut)
def get_complex_portfolios(
    complex_id: int = Query(..., ge=1),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> ZipteriorComplexPortfolioListOut:
    return zipterior_client.get_complex_portfolios(complex_id=complex_id, limit=limit, offset=offset)


@router.get("/portfolios/{portfolio_id}", response_model=ZipteriorPortfolioDetailOut)
def get_portfolio_detail(portfolio_id: int) -> ZipteriorPortfolioDetailOut:
    return zipterior_client.get_portfolio_detail(portfolio_id)


@router.get("/search", response_model=ZipteriorSearchOut)
def search(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=20)) -> ZipteriorSearchOut:
    return zipterior_client.search(q=q, limit=limit)
