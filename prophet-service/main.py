from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prophet import Prophet
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WSMS Prophet Forecast Service",
    description="Facebook Prophet demand forecasting microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SalesRecord(BaseModel):
    ds: str    # date string "YYYY-MM-DD"
    y: float   # sales quantity


class ForecastRequest(BaseModel):
    product_id: int
    supermarket_id: int
    history: List[SalesRecord]
    periods: int = 30


class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float


@app.get("/health")
def health():
    return {"status": "ok", "service": "prophet-forecast"}


@app.post("/forecast", response_model=List[ForecastPoint])
def forecast(req: ForecastRequest):
    if len(req.history) < 10:
        raise HTTPException(
            status_code=422,
            detail=f"Need at least 10 historical data points. Got {len(req.history)}."
        )

    logger.info(
        "Forecast request: product=%d supermarket=%d history=%d periods=%d",
        req.product_id, req.supermarket_id, len(req.history), req.periods
    )

    df = pd.DataFrame([{"ds": r.ds, "y": r.y} for r in req.history])
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = df["y"].clip(lower=0)   # demand can't be negative

    model = Prophet(
        weekly_seasonality=True,
        yearly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,   # lower = less overfitting
        seasonality_prior_scale=10.0,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=req.periods)
    forecast_df = model.predict(future)

    result = []
    for _, row in forecast_df.tail(req.periods).iterrows():
        result.append(ForecastPoint(
            ds=row["ds"].strftime("%Y-%m-%d"),
            yhat=max(0.0, round(float(row["yhat"]), 2)),
            yhat_lower=max(0.0, round(float(row["yhat_lower"]), 2)),
            yhat_upper=max(0.0, round(float(row["yhat_upper"]), 2)),
        ))

    logger.info("Returning %d forecast points", len(result))
    return result
