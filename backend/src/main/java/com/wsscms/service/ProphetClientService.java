package com.wsscms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Client service that proxies forecast requests to the Python FastAPI/Prophet microservice.
 * Falls back gracefully if the Prophet service is unavailable.
 */
@Service
public class ProphetClientService {

    private static final Logger logger = LoggerFactory.getLogger(ProphetClientService.class);

    private final WebClient webClient;

    public ProphetClientService(@Value("${prophet.service.url:http://localhost:8000}") String prophetUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(prophetUrl)
                .build();
    }

    /**
     * Forecast request payload sent to the Python service.
     */
    public record SalesRecord(String ds, double y) {}

    public record ForecastRequest(
            Long productId,
            Long supermarketId,
            List<SalesRecord> history,
            int periods
    ) {}

    /**
     * Forecast result returned by the Python service.
     */
    public record ForecastPoint(
            String ds,
            BigDecimal yhat,
            BigDecimal yhat_lower,
            BigDecimal yhat_upper
    ) {}

    /**
     * Call the Prophet microservice and return forecast points.
     *
     * @param productId     product to forecast
     * @param supermarketId supermarket context
     * @param history       list of {ds, y} historical sales records
     * @param periods       number of days to forecast ahead
     * @return list of ForecastPoint with predicted demand and confidence bands
     */
    public List<ForecastPoint> getForecast(Long productId, Long supermarketId,
                                           List<SalesRecord> history, int periods) {
        if (history.size() < 10) {
            throw new IllegalArgumentException(
                    "At least 10 historical data points are required for Prophet forecasting. " +
                    "Current count: " + history.size());
        }

        ForecastRequest requestBody = new ForecastRequest(productId, supermarketId, history, periods);

        try {
            logger.info("Calling Prophet service for product={} supermarket={} periods={}",
                    productId, supermarketId, periods);

            List<Map> rawResult = webClient.post()
                    .uri("/forecast")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToFlux(Map.class)
                    .collectList()
                    .block(Duration.ofSeconds(60));

            if (rawResult == null) {
                throw new RuntimeException("Prophet service returned empty response");
            }

            List<ForecastPoint> result = rawResult.stream()
                    .map(m -> new ForecastPoint(
                            String.valueOf(m.get("ds")),
                            toBigDecimal(m.get("yhat")),
                            toBigDecimal(m.get("yhat_lower")),
                            toBigDecimal(m.get("yhat_upper"))
                    ))
                    .toList();

            logger.info("Prophet service returned {} forecast points", result.size());
            return result;

        } catch (WebClientResponseException e) {
            logger.error("Prophet service error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Forecast service error: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to reach Prophet service: {}", e.getMessage());
            throw new RuntimeException("Forecast service is currently unavailable. Please try again later.");
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue()).max(BigDecimal.ZERO);
        return BigDecimal.ZERO;
    }
}
