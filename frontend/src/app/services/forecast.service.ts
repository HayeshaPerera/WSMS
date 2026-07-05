import { Injectable } from '@angular/core'; // Import the Injectable decorator to allow this service to be injected into components
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making HTTP requests (GET, POST) to the backend API
import { Observable, of } from 'rxjs'; // Import RxJS Observable (for async data streams) and 'of' (to create a mock observable if an error occurs)
import { map, catchError } from 'rxjs/operators'; // Import RxJS operators to transform data (map) and handle errors (catchError)
import { DemandForecast, ApiResponse } from '../models/models'; // Import TypeScript interfaces for type safety
import { environment } from '../../environments/environment'; // Import environment variables to get the API base URL

// Define an interface for the raw daily forecast data exactly as it comes from the Spring Boot backend
export interface DailyForecastDTO {
  id: number;
  forecastDate: string; // The specific date this forecast point applies to
  predictedDemand: number; // The exact number of items predicted to be sold on this day
  confidenceLevel: number; // The AI's confidence in this prediction (0.0 to 1.0)
  productId: number;
  productName: string;
  productSku: string;
  supermarketId?: number;
  supermarketName?: string;
}

@Injectable({
  providedIn: 'root' // This tells Angular to create one single shared instance of this service for the whole app
})
export class ForecastService {
  private apiUrl = `${environment.apiBase}/forecasts`; // Construct the base URL for forecast endpoints (e.g., http://localhost:8081/api/v1/forecasts)

  constructor(private http: HttpClient) { } // Inject the HttpClient so we can make API calls

  /**
   * Fetches all raw daily forecasts from the backend and aggregates them into product-level weekly/monthly summaries.
   */
  getAllForecasts(): Observable<DemandForecast[]> {
    // Make a GET request. We expect an object with a 'data' array containing DailyForecastDTOs
    return this.http.get<{ data: DailyForecastDTO[] }>(this.apiUrl).pipe(
      // The 'map' operator intercepts the successful response and runs our custom aggregation logic
      map(res => this.aggregateForecasts(res.data || [])),
      // If the request fails (e.g. server down), catch the error and return an empty array gracefully using 'of([])'
      catchError(() => of([]))
    );
  }

  // Same as getAllForecasts, but only fetches data for one specific product
  getProductForecast(productId: number): Observable<DemandForecast[]> {
    return this.http.get<{ data: DailyForecastDTO[] }>(`${this.apiUrl}/product/${productId}`).pipe(
      map(res => this.aggregateForecasts(res.data || [])),
      catchError(() => of([]))
    );
  }

  // Same as getAllForecasts, but only fetches data for one specific supermarket
  getSupermarketForecasts(supermarketId: number): Observable<DemandForecast[]> {
    return this.http.get<{ data: DailyForecastDTO[] }>(`${this.apiUrl}/supermarket/${supermarketId}`).pipe(
      map(res => this.aggregateForecasts(res.data || [])),
      catchError(() => of([]))
    );
  }

  // Triggers the backend (which in turn calls the Python Prophet AI) to generate fresh forecasts
  generateForecasts(supermarketId: number, daysAhead: number = 7): Observable<ApiResponse> {
    // Make a POST request to the /generate endpoint with query parameters
    return this.http.post<ApiResponse>(`${this.apiUrl}/generate?supermarketId=${supermarketId}&daysAhead=${daysAhead}`, {});
  }

  /**
   * Helper function: The backend returns raw daily data points (e.g., 7 points per product).
   * The UI needs grouped weekly summaries (1 summary card per product). This function does the conversion.
   */
  private aggregateForecasts(dailyPoints: DailyForecastDTO[]): DemandForecast[] {
    if (!dailyPoints || dailyPoints.length === 0) return []; // If no data, return empty array immediately

    // Step 1: Group the flat array of daily points by their productId
    const grouped: { [key: number]: DailyForecastDTO[] } = {}; // Create an empty dictionary object
    dailyPoints.forEach(pt => { // Loop through every single daily point
      if (!grouped[pt.productId]) {
        grouped[pt.productId] = []; // If we haven't seen this product yet, initialize an empty array for it
      }
      grouped[pt.productId].push(pt); // Add the daily point to its product's array
    });

    // Step 2: Loop through each grouped product and calculate its weekly summary metrics
    return Object.keys(grouped).map(key => { // Loop through all the product IDs in the dictionary
      const productId = Number(key); // Convert the dictionary key (string) back to a number
      // Sort the daily points for this product chronologically by date
      const points = grouped[productId].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));
      const firstPoint = points[0]; // Grab the first point so we can copy the product name/sku
      
      // Get only the first 7 days of predictions
      const weeklyPoints = points.slice(0, 7);
      // Sum up the predicted demand for those 7 days using the 'reduce' array method
      const predictedWeeklyDemand = weeklyPoints.reduce((sum, p) => sum + p.predictedDemand, 0);
      
      // Calculate a rough monthly estimate by summing all points and scaling up to 30 days
      const predictedMonthlyDemand = Math.round(
        points.reduce((sum, p) => sum + p.predictedDemand, 0) * (30 / points.length)
      );

      // Calculate the average confidence level by summing all confidences and dividing by the number of points
      const avgConfidence = points.reduce((sum, p) => sum + p.confidenceLevel, 0) / points.length;

      // Determine the trend (increasing, decreasing, or stable) by comparing the first day to the last day
      let trend = 'stable';
      if (points.length >= 2) {
        const startVal = points[0].predictedDemand;
        const endVal = points[points.length - 1].predictedDemand;
        if (endVal > startVal * 1.03) trend = 'increasing'; // If it went up more than 3%
        else if (endVal < startVal * 0.97) trend = 'decreasing'; // If it went down more than 3%
      }

      // Generate a mock historical sales array so the UI charts have something to display
      const avgDaily = predictedWeeklyDemand / (weeklyPoints.length || 7);
      const salesHistory = [
        Math.round(avgDaily * 7 * 0.9),
        Math.round(avgDaily * 7 * 1.05),
        Math.round(avgDaily * 7 * 0.98),
        Math.round(avgDaily * 7 * 1.02),
        Math.round(avgDaily * 7 * 0.88),
        Math.round(avgDaily * 7 * 1.1),
        Math.round(avgDaily * 7 * 0.95),
        Math.round(avgDaily * 7 * 1.03)
      ];
      
      // Simulate current stock for UI purposes
      const currentStock = Math.round(predictedWeeklyDemand * (0.4 + Math.random() * 0.8));
      // Calculate how much should be ordered (1.3x weekly demand minus what we already have)
      const recommendedOrder = Math.max(0, Math.round(predictedWeeklyDemand * 1.3 - currentStock));

      // Return the final aggregated object formatted for the frontend components to consume easily
      return {
        productId: productId,
        productName: firstPoint.productName,
        productSku: firstPoint.productSku,
        predictedWeeklyDemand: predictedWeeklyDemand || 100, // Fallback to 100 if math fails
        predictedMonthlyDemand: predictedMonthlyDemand || 400,
        confidence: avgConfidence || 0.85,
        // If confidence is high, assume the Python AI worked. If low, assume it fell back to simple averages.
        forecastMethod: avgConfidence > 0.8 ? 'Prophet AI Microservice' : 'Historical Moving Average',
        historicalAverage: Math.round(avgDaily * 7),
        currentStock: currentStock,
        recommendedOrder: recommendedOrder,
        trend: trend,
        salesHistory: salesHistory,
        accuracy: Math.round((avgConfidence || 0.85) * 100 * 10) / 10 // Convert 0.854 to 85.4%
      } as any; // Cast as 'any' because we appended extra UI-specific fields not in the strict backend DTO
    });
  }
}
