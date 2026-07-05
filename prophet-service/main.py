from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prophet import Prophet
import pandas as pd
from pydantic import BaseModel
from typing import List, Optional
import logging

# ─────────────────────────────────────────────────────────
# Initialization & Setup
# ─────────────────────────────────────────────────────────
# Setup standard Python logging to print info to the Docker container console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the FastAPI web server app
app = FastAPI(
    title="WSMS Prophet Forecast Service",
    description="Facebook Prophet demand forecasting microservice",
    version="1.0.0"
)

# Allow CORS (Cross-Origin Resource Sharing) so our Java Backend or Angular Frontend
# can communicate with this Python API without browser security blocks.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Pydantic Data Models (DTOs)
# ─────────────────────────────────────────────────────────
# These classes define the strict JSON schema expected by the API.
# Pydantic automatically validates incoming data and throws 422 if it's wrong.

class SalesRecord(BaseModel):
    """Represents a single historical data point"""
    ds: str    # Date String in "YYYY-MM-DD" format (required by Prophet)
    y: float   # The target value we want to predict (Sales Quantity)

class ForecastRequest(BaseModel):
    """The JSON payload sent by the Java Backend to request a forecast"""
    product_id: int
    supermarket_id: int
    history: List[SalesRecord] # Array of past sales data
    periods: int = 30          # How many days into the future to predict (defaults to 30)

class ForecastPoint(BaseModel):
    """The JSON response structure sent back to Java"""
    ds: str            # The future date
    yhat: float        # The predicted demand value (y-hat)
    yhat_lower: float  # The lower bound of the confidence interval
    yhat_upper: float  # The upper bound of the confidence interval

# ─────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """
    Simple health check endpoint used by Docker/Kubernetes to verify 
    the AI microservice is alive and responding.
    """
    return {"status": "ok", "service": "prophet-forecast"}


@app.post("/forecast", response_model=List[ForecastPoint])
def forecast(req: ForecastRequest):
    """
    The core Machine Learning endpoint.
    Takes historical sales data and uses Facebook Prophet to predict future demand.
    """
    # 1. Validation: Prophet requires at least a small baseline of data to find patterns.
    # If we have less than 10 days of history, we abort and tell Java to use its math fallback.
    if len(req.history) < 10:
        raise HTTPException(
            status_code=422,
            detail=f"Need at least 10 historical data points. Got {len(req.history)}."
        )

    logger.info(
        "Forecast request: product=%d supermarket=%d history=%d periods=%d",
        req.product_id, req.supermarket_id, len(req.history), req.periods
    )

    # 2. Data Preparation
    # Convert the JSON array into a Pandas DataFrame (a highly optimized data table used in Python Data Science)
    df = pd.DataFrame([{"ds": r.ds, "y": r.y} for r in req.history])
    
    # Ensure the 'ds' column is strictly treated as datetime objects
    df["ds"] = pd.to_datetime(df["ds"])
    
    # Clean the data: Demand can never mathematically be negative, so we clip all minimum values to 0.
    df["y"] = df["y"].clip(lower=0)   

    # 3. Model Training
    # Initialize Facebook Prophet. We configure it to look for weekly (e.g. weekend spikes) 
    # and yearly (e.g. holiday spikes) seasonal patterns.
    # 'changepoint_prior_scale' is a hyperparameter that controls model flexibility. 
    # Setting it to 0.05 prevents the model from "overfitting" (chasing random noisy blips).
    model = Prophet(
        weekly_seasonality=True,
        yearly_seasonality=True,
        daily_seasonality=False, # We don't care about time-of-day for daily stock
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
    )
    
    # Train the neural network on the historical dataframe
    model.fit(df)

    # 4. Forecasting
    # Extend the timeline into the future by the requested number of periods (days)
    future = model.make_future_dataframe(periods=req.periods)
    
    # Perform the heavy mathematical prediction. This generates 'yhat' (the prediction)
    # along with 'yhat_lower' and 'yhat_upper' (the uncertainty/confidence intervals).
    forecast_df = model.predict(future)

    # 5. Response Formatting
    # Extract just the newly predicted future rows (ignoring the historical fit)
    result = []
    for _, row in forecast_df.tail(req.periods).iterrows():
        result.append(ForecastPoint(
            ds=row["ds"].strftime("%Y-%m-%d"),
            # We use max(0.0) to ensure Prophet doesn't accidentally predict negative sales
            yhat=max(0.0, round(float(row["yhat"]), 2)),
            yhat_lower=max(0.0, round(float(row["yhat_lower"]), 2)),
            yhat_upper=max(0.0, round(float(row["yhat_upper"]), 2)),
        ))

    logger.info("Returning %d forecast points", len(result))
    
    # FastAPI automatically serializes this List[ForecastPoint] back into raw JSON
    return result
