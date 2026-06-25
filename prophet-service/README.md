# AI Demand Forecasting Microservice (Prophet)

This is a Python-based microservice that exposes a REST API for time-series demand forecasting. It utilizes [Facebook Prophet](https://facebook.github.io/prophet/), a robust forecasting procedure for time-series data based on an additive model where non-linear trends are fit with yearly, weekly, and daily seasonality.

## Architecture & Integration

This microservice is designed to operate alongside the main Spring Boot backend. 
- **Framework**: FastAPI (Python)
- **Model**: Facebook Prophet
- **Communication**: The Java Spring Boot backend communicates with this service over HTTP (default: `http://localhost:8000/forecast`).

> **Note on Resilience**: If this Python microservice is offline or unreachable, the Java backend implements a graceful fallback mechanism using a Linear Regression algorithm to continue serving trend projections without interruption.

## Why Docker is the Recommended Deployment Method

The `prophet` package relies heavily on a C++ backend (`Stan`) for Bayesian inference. Installing this natively on Windows requires a specific C++ Build Tools toolchain and compiler configuration, which can be brittle and highly dependent on the host machine's Python version (e.g., Python 3.12 lacks pre-built wheels for Prophet on Windows).

**To eliminate all "it works on my machine" issues and ensure a flawless environment for code reviewers and deployments, this service is fully containerized.**

## How to Run

### Method 1: Using Docker (Recommended)

This is the standard industry practice. You do not need Python or any C++ compilers installed locally.

1. Ensure **Docker Desktop** is installed and running.
2. From the root directory of the project, run:
   ```bash
   docker-compose up -d --build prophet-service
   ```
3. The service will be available at `http://localhost:8000`.

### Method 2: Native Local Installation (Windows)

If you must run it locally without Docker, you will need to prepare your Windows environment to compile C++ code:

1. Install the [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. During installation, select the **"Desktop development with C++"** workload.
3. Once installed, open a terminal and set up a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
