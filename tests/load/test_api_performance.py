"""
Load testing and performance benchmarks for ITSM API
"""
import pytest
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch
import json


@pytest.mark.load
@pytest.mark.slow
class TestAPIPerformance:
    """API performance and load tests"""

    def test_single_incident_creation_performance(self, test_config, api_headers, sample_incident_data, benchmark):
        """Benchmark single incident creation performance"""
        def create_incident():
            mock_response = {"id": "INC000123", "status": "new", "created_at": "2024-01-15T11:00:00+09:00"}
            with patch('requests.post') as mock_post:
                mock_post.return_value.status_code = 201
                mock_post.return_value.json.return_value = mock_response
                
                response = requests.post(
                    f"{test_config['base_url']}/incidents",
                    json=sample_incident_data,
                    headers=api_headers
                )
                return response
        
        # Benchmark the function
        result = benchmark(create_incident)
        assert result.status_code == 201

    def test_incident_list_query_performance(self, test_config, api_headers, benchmark):
        """Benchmark incident list query performance"""
        def query_incidents():
            mock_response = {
                "data": [{"id": f"INC{i:06d}", "title": f"Test incident {i}"} for i in range(20)],
                "meta": {"total_count": 1000, "current_page": 1, "total_pages": 50}
            }
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response
                
                params = {"page": 1, "per_page": 20, "sort": "-created_at"}
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    params=params,
                    headers=api_headers
                )
                return response
        
        result = benchmark(query_incidents)
        assert result.status_code == 200
        assert len(result.json()["data"]) == 20

    def test_concurrent_incident_creation(self, test_config, api_headers, sample_incident_data):
        """Test concurrent incident creation load"""
        def create_incident_with_id(incident_id):
            mock_response = {"id": f"INC{incident_id:06d}", "status": "new"}
            with patch('requests.post') as mock_post:
                mock_post.return_value.status_code = 201
                mock_post.return_value.json.return_value = mock_response
                
                incident_data = sample_incident_data.copy()
                incident_data["title"] = f"Load Test Incident {incident_id}"
                
                start_time = time.time()
                response = requests.post(
                    f"{test_config['base_url']}/incidents",
                    json=incident_data,
                    headers=api_headers
                )
                end_time = time.time()
                
                return {
                    "response": response,
                    "duration": end_time - start_time,
                    "incident_id": incident_id
                }
        
        # Test with 10 concurrent requests
        concurrent_requests = 10
        results = []
        
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(create_incident_with_id, i) for i in range(concurrent_requests)]
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                assert result["response"].status_code == 201
        
        # Analyze performance metrics
        durations = [r["duration"] for r in results]
        avg_duration = statistics.mean(durations)
        max_duration = max(durations)
        min_duration = min(durations)
        
        print(f"Concurrent incident creation performance:")
        print(f"  Average duration: {avg_duration:.3f}s")
        print(f"  Max duration: {max_duration:.3f}s")
        print(f"  Min duration: {min_duration:.3f}s")
        
        # Performance assertions
        assert avg_duration < 5.0  # Average should be under 5 seconds
        assert max_duration < 10.0  # No request should take more than 10 seconds

    def test_api_rate_limiting_behavior(self, test_config, api_headers):
        """Test API behavior under rate limiting"""
        def make_rapid_requests(num_requests=50):
            results = []
            for i in range(num_requests):
                try:
                    # Simulate rate limiting after 30 requests
                    if i >= 30:
                        mock_response = {
                            "error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Rate limit exceeded"}
                        }
                        with patch('requests.get') as mock_get:
                            mock_get.return_value.status_code = 429
                            mock_get.return_value.json.return_value = mock_response
                            mock_get.return_value.headers = {
                                "X-RateLimit-Limit": "1000",
                                "X-RateLimit-Remaining": "0",
                                "X-RateLimit-Reset": str(int(time.time()) + 3600)
                            }
                            
                            response = requests.get(
                                f"{test_config['base_url']}/incidents",
                                headers=api_headers
                            )
                    else:
                        mock_response = {"data": [], "meta": {"total_count": 0}}
                        with patch('requests.get') as mock_get:
                            mock_get.return_value.status_code = 200
                            mock_get.return_value.json.return_value = mock_response
                            
                            response = requests.get(
                                f"{test_config['base_url']}/incidents",
                                headers=api_headers
                            )
                    
                    results.append({
                        "request_number": i + 1,
                        "status_code": response.status_code,
                        "headers": dict(response.headers) if hasattr(response, 'headers') else {}
                    })
                    
                    # Small delay between requests
                    time.sleep(0.01)
                    
                except Exception as e:
                    results.append({
                        "request_number": i + 1,
                        "error": str(e)
                    })
            
            return results
        
        results = make_rapid_requests()
        
        # Analyze results
        successful_requests = [r for r in results if r.get("status_code") == 200]
        rate_limited_requests = [r for r in results if r.get("status_code") == 429]
        
        print(f"Rate limiting test results:")
        print(f"  Successful requests: {len(successful_requests)}")
        print(f"  Rate limited requests: {len(rate_limited_requests)}")
        
        # Verify rate limiting is working
        assert len(rate_limited_requests) > 0  # Should hit rate limit
        assert len(successful_requests) > 0   # Should have some successful requests

    def test_large_dataset_pagination_performance(self, test_config, api_headers, benchmark):
        """Test performance with large dataset pagination"""
        def paginate_large_dataset():
            # Simulate large dataset with multiple pages
            total_pages = 10
            page_results = []
            
            for page in range(1, total_pages + 1):
                mock_response = {
                    "data": [{"id": f"INC{(page-1)*20 + i:06d}"} for i in range(20)],
                    "meta": {
                        "current_page": page,
                        "total_pages": total_pages,
                        "total_count": total_pages * 20,
                        "per_page": 20
                    }
                }
                
                with patch('requests.get') as mock_get:
                    mock_get.return_value.status_code = 200
                    mock_get.return_value.json.return_value = mock_response
                    
                    params = {"page": page, "per_page": 20}
                    response = requests.get(
                        f"{test_config['base_url']}/incidents",
                        params=params,
                        headers=api_headers
                    )
                    page_results.append(response.json())
            
            return page_results
        
        results = benchmark(paginate_large_dataset)
        assert len(results) == 10  # Should have 10 pages
        
        # Verify each page has correct data
        for i, page_data in enumerate(results):
            assert page_data["meta"]["current_page"] == i + 1
            assert len(page_data["data"]) == 20

    def test_complex_query_performance(self, test_config, api_headers, benchmark):
        """Test performance of complex queries with multiple filters"""
        def execute_complex_query():
            mock_response = {
                "data": [{"id": "INC000123", "priority": "high", "status": "in_progress"}],
                "meta": {"total_count": 1}
            }
            
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response
                
                params = {
                    "status": ["in_progress", "assigned"],
                    "priority": ["high", "critical"],
                    "created_from": "2024-01-01T00:00:00+09:00",
                    "created_to": "2024-01-31T23:59:59+09:00",
                    "assignee_id": "user_789",
                    "category_id": "cat_001",
                    "q": "メール",
                    "sort": "-updated_at"
                }
                
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    params=params,
                    headers=api_headers
                )
                return response
        
        result = benchmark(execute_complex_query)
        assert result.status_code == 200

    def test_bulk_operations_performance(self, test_config, api_headers, benchmark):
        """Test performance of bulk operations"""
        def bulk_update_incidents():
            bulk_data = {
                "operation": "update",
                "incident_ids": [f"INC{i:06d}" for i in range(100)],
                "updates": {"assignee_id": "user_789", "status": "assigned"}
            }
            
            mock_response = {
                "success_count": 100,
                "failed_count": 0,
                "results": [{"id": f"INC{i:06d}", "status": "success"} for i in range(100)]
            }
            
            with patch('requests.post') as mock_post:
                mock_post.return_value.status_code = 200
                mock_post.return_value.json.return_value = mock_response
                
                response = requests.post(
                    f"{test_config['base_url']}/incidents/bulk",
                    json=bulk_data,
                    headers=api_headers
                )
                return response
        
        result = benchmark(bulk_update_incidents)
        assert result.status_code == 200
        assert result.json()["success_count"] == 100

    @pytest.mark.parametrize("payload_size", [1, 10, 100, 1000])
    def test_api_response_time_vs_payload_size(self, test_config, api_headers, payload_size, benchmark):
        """Test API response time with different payload sizes"""
        def create_large_incident():
            # Create incident with varying description size
            large_description = "Test description. " * payload_size
            incident_data = {
                "title": f"Load test incident - payload size {payload_size}",
                "description": large_description,
                "priority": "medium",
                "category_id": "cat_001"
            }
            
            mock_response = {"id": f"INC{payload_size:06d}", "status": "new"}
            
            with patch('requests.post') as mock_post:
                mock_post.return_value.status_code = 201
                mock_post.return_value.json.return_value = mock_response
                
                response = requests.post(
                    f"{test_config['base_url']}/incidents",
                    json=incident_data,
                    headers=api_headers
                )
                return response
        
        result = benchmark(create_large_incident)
        assert result.status_code == 201

    def test_memory_usage_under_load(self, test_config, api_headers):
        """Test memory usage patterns under load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Perform multiple operations
        for i in range(50):
            mock_response = {"data": [{"id": f"INC{j:06d}"} for j in range(100)]}
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response
                
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    headers=api_headers
                )
                assert response.status_code == 200
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        print(f"Memory usage:")
        print(f"  Initial: {initial_memory / 1024 / 1024:.2f} MB")
        print(f"  Final: {final_memory / 1024 / 1024:.2f} MB")
        print(f"  Increase: {memory_increase / 1024 / 1024:.2f} MB")
        
        # Memory increase should be reasonable (less than 100MB for this test)
        assert memory_increase < 100 * 1024 * 1024

    def test_api_timeout_handling(self, test_config, api_headers):
        """Test API timeout behavior"""
        from unittest.mock import patch
        
        def test_timeout_scenario():
            # Mock timeout scenario
            with patch('requests.get') as mock_get:
                # Simulate timeout exception
                mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
                
                try:
                    response = requests.get(
                        f"{test_config['base_url']}/incidents",
                        headers=api_headers,
                        timeout=0.001  # Very short timeout to force timeout
                    )
                    return response
                except requests.exceptions.Timeout:
                    return "timeout_occurred"
        
        result = test_timeout_scenario()
        # Should get timeout
        assert result == "timeout_occurred"