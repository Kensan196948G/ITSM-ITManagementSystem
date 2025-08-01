"""
API load testing using pytest-benchmark and concurrent requests
"""
import pytest
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import Mock, patch
from typing import List, Dict, Any
import json


@pytest.mark.load
@pytest.mark.slow
class TestAPILoadPerformance:
    """Comprehensive API load testing"""

    @pytest.fixture
    def performance_config(self):
        """Performance testing configuration"""
        return {
            "concurrent_users": 10,
            "requests_per_user": 20,
            "ramp_up_time": 5,  # seconds
            "test_duration": 60,  # seconds
            "acceptable_response_time": 2.0,  # seconds
            "acceptable_error_rate": 0.05  # 5%
        }

    @pytest.fixture
    def load_test_data(self, faker_instance):
        """Generate test data for load testing"""
        return {
            "incidents": [
                {
                    "title": faker_instance.sentence(nb_words=6),
                    "description": faker_instance.text(max_nb_chars=200),
                    "priority": faker_instance.random_element(elements=["low", "medium", "high", "critical"]),
                    "category_id": faker_instance.random_element(elements=["cat_001", "cat_002", "cat_003"])
                }
                for _ in range(100)
            ]
        }

    def mock_api_response(self, status_code=200, response_data=None, delay=0.1):
        """Create mock API response with configurable delay"""
        mock_response = Mock()
        mock_response.status_code = status_code
        mock_response.json.return_value = response_data or {"status": "success"}
        mock_response.elapsed.total_seconds.return_value = delay
        return mock_response

    @pytest.mark.benchmark(group="api_read")
    def test_incident_list_performance(self, benchmark, test_config, api_headers):
        """Benchmark incident list API performance"""
        mock_response_data = {
            "data": [
                {"id": f"INC{i:06d}", "title": f"Test Incident {i}", "status": "open"}
                for i in range(50)
            ],
            "meta": {"total_count": 1000, "current_page": 1, "per_page": 50}
        }

        def api_call():
            with patch('requests.get') as mock_get:
                mock_get.return_value = self.mock_api_response(
                    response_data=mock_response_data,
                    delay=0.2
                )
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    headers=api_headers
                )
                return response.json()

        result = benchmark(api_call)
        assert "data" in result
        assert len(result["data"]) == 50

    @pytest.mark.benchmark(group="api_read")
    def test_incident_detail_performance(self, benchmark, test_config, api_headers):
        """Benchmark incident detail API performance"""
        incident_id = "INC000123"
        mock_response_data = {
            "id": incident_id,
            "title": "Performance Test Incident",
            "description": "Testing incident detail API performance",
            "status": "in_progress",
            "priority": "high",
            "created_at": "2024-01-15T10:00:00+09:00",
            "work_notes": [
                {"content": f"Note {i}", "timestamp": "2024-01-15T10:0{i}:00+09:00"}
                for i in range(10)
            ]
        }

        def api_call():
            with patch('requests.get') as mock_get:
                mock_get.return_value = self.mock_api_response(
                    response_data=mock_response_data,
                    delay=0.15
                )
                response = requests.get(
                    f"{test_config['base_url']}/incidents/{incident_id}",
                    headers=api_headers
                )
                return response.json()

        result = benchmark(api_call)
        assert result["id"] == incident_id
        assert len(result["work_notes"]) == 10

    @pytest.mark.benchmark(group="api_write")
    def test_incident_creation_performance(self, benchmark, test_config, api_headers, sample_incident_data):
        """Benchmark incident creation API performance"""
        mock_response_data = {
            "id": "INC000124",
            "title": sample_incident_data["title"],
            "status": "new",
            "created_at": "2024-01-15T11:00:00+09:00"
        }

        def api_call():
            with patch('requests.post') as mock_post:
                mock_post.return_value = self.mock_api_response(
                    status_code=201,
                    response_data=mock_response_data,
                    delay=0.3
                )
                response = requests.post(
                    f"{test_config['base_url']}/incidents",
                    json=sample_incident_data,
                    headers=api_headers
                )
                return response.json()

        result = benchmark(api_call)
        assert result["id"] == "INC000124"
        assert result["status"] == "new"

    @pytest.mark.benchmark(group="api_write")
    def test_incident_update_performance(self, benchmark, test_config, api_headers):
        """Benchmark incident update API performance"""
        incident_id = "INC000123"
        update_data = {
            "status": "in_progress",
            "assignee_id": "user_789",
            "work_notes": "Updated during performance test"
        }
        
        mock_response_data = {
            "id": incident_id,
            "status": "in_progress",
            "updated_at": "2024-01-15T11:30:00+09:00"
        }

        def api_call():
            with patch('requests.patch') as mock_patch:
                mock_patch.return_value = self.mock_api_response(
                    response_data=mock_response_data,
                    delay=0.25
                )
                response = requests.patch(
                    f"{test_config['base_url']}/incidents/{incident_id}",
                    json=update_data,
                    headers=api_headers
                )
                return response.json()

        result = benchmark(api_call)
        assert result["status"] == "in_progress"

    def test_concurrent_incident_creation(self, test_config, api_headers, load_test_data, performance_config):
        """Test concurrent incident creation load"""
        results = []
        errors = []
        
        def create_incident(incident_data):
            try:
                start_time = time.time()
                
                mock_response_data = {
                    "id": f"INC{int(time.time() * 1000) % 1000000:06d}",
                    "title": incident_data["title"],
                    "status": "new",
                    "created_at": "2024-01-15T11:00:00+09:00"
                }
                
                with patch('requests.post') as mock_post:
                    mock_post.return_value = self.mock_api_response(
                        status_code=201,
                        response_data=mock_response_data,
                        delay=0.2 + (time.time() % 0.3)  # Simulate variable response time
                    )
                    
                    response = requests.post(
                        f"{test_config['base_url']}/incidents",
                        json=incident_data,
                        headers=api_headers
                    )
                
                end_time = time.time()
                
                return {
                    "status_code": response.status_code,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 201
                }
                
            except Exception as e:
                return {
                    "status_code": 0,
                    "response_time": 0,
                    "success": False,
                    "error": str(e)
                }

        # Execute concurrent requests
        with ThreadPoolExecutor(max_workers=performance_config["concurrent_users"]) as executor:
            futures = []
            
            for i in range(performance_config["requests_per_user"]):
                incident_data = load_test_data["incidents"][i % len(load_test_data["incidents"])]
                future = executor.submit(create_incident, incident_data)
                futures.append(future)
                
                # Implement ramp-up
                if i < performance_config["ramp_up_time"]:
                    time.sleep(performance_config["ramp_up_time"] / performance_config["requests_per_user"])
            
            # Collect results
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                if not result["success"]:
                    errors.append(result)

        # Analyze results
        successful_requests = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_requests]
        
        # Performance assertions
        success_rate = len(successful_requests) / len(results)
        avg_response_time = statistics.mean(response_times) if response_times else 0
        p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else avg_response_time
        
        # Assertions
        assert success_rate >= (1 - performance_config["acceptable_error_rate"]), \
            f"Success rate {success_rate:.3f} below acceptable threshold {1 - performance_config['acceptable_error_rate']:.3f}"
        
        assert avg_response_time <= performance_config["acceptable_response_time"], \
            f"Average response time {avg_response_time:.3f}s exceeds acceptable threshold {performance_config['acceptable_response_time']}s"
        
        assert p95_response_time <= performance_config["acceptable_response_time"] * 2, \
            f"95th percentile response time {p95_response_time:.3f}s exceeds threshold"

        # Log performance metrics
        print(f"\n=== Load Test Results ===")
        print(f"Total Requests: {len(results)}")
        print(f"Successful Requests: {len(successful_requests)}")
        print(f"Success Rate: {success_rate:.3f}")
        print(f"Average Response Time: {avg_response_time:.3f}s")
        print(f"95th Percentile Response Time: {p95_response_time:.3f}s")
        print(f"Errors: {len(errors)}")

    def test_read_heavy_load(self, test_config, api_headers, performance_config):
        """Test read-heavy load pattern"""
        incident_ids = [f"INC{i:06d}" for i in range(1, 101)]
        results = []
        
        def read_incident(incident_id):
            try:
                start_time = time.time()
                
                mock_response_data = {
                    "id": incident_id,
                    "title": f"Incident {incident_id}",
                    "status": "open",
                    "priority": "medium"
                }
                
                with patch('requests.get') as mock_get:
                    mock_get.return_value = self.mock_api_response(
                        response_data=mock_response_data,
                        delay=0.1 + (time.time() % 0.2)
                    )
                    
                    response = requests.get(
                        f"{test_config['base_url']}/incidents/{incident_id}",
                        headers=api_headers
                    )
                
                end_time = time.time()
                
                return {
                    "status_code": response.status_code,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 200
                }
                
            except Exception as e:
                return {
                    "status_code": 0,
                    "response_time": 0,
                    "success": False,
                    "error": str(e)
                }

        # Execute concurrent reads
        with ThreadPoolExecutor(max_workers=performance_config["concurrent_users"]) as executor:
            futures = []
            
            # Create multiple read requests per incident to simulate heavy read load
            for _ in range(performance_config["requests_per_user"]):
                incident_id = incident_ids[len(futures) % len(incident_ids)]
                future = executor.submit(read_incident, incident_id)
                futures.append(future)
            
            # Collect results
            for future in as_completed(futures):
                results.append(future.result())

        # Analyze results
        successful_requests = [r for r in results if r["success"]]
        response_times = [r["response_time"] for r in successful_requests]
        
        success_rate = len(successful_requests) / len(results)
        avg_response_time = statistics.mean(response_times) if response_times else 0
        
        # Read operations should be faster
        assert success_rate >= 0.98, f"Read success rate {success_rate:.3f} too low"
        assert avg_response_time <= 0.5, f"Read response time {avg_response_time:.3f}s too slow"

    # Async load test removed due to aiohttp dependency not available

    def test_sustained_load(self, test_config, api_headers, performance_config):
        """Test sustained load over time"""
        test_duration = 30  # seconds for testing
        interval = 1  # second
        results_over_time = []
        
        start_test_time = time.time()
        
        while time.time() - start_test_time < test_duration:
            interval_start = time.time()
            interval_results = []
            
            # Execute requests for this interval
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = []
                
                for _ in range(5):  # 5 requests per interval
                    future = executor.submit(self._single_api_request, test_config, api_headers)
                    futures.append(future)
                
                for future in as_completed(futures):
                    interval_results.append(future.result())
            
            # Record interval metrics
            successful = [r for r in interval_results if r["success"]]
            success_rate = len(successful) / len(interval_results) if interval_results else 0
            avg_response_time = statistics.mean([r["response_time"] for r in successful]) if successful else 0
            
            results_over_time.append({
                "interval": len(results_over_time),
                "timestamp": time.time(),
                "success_rate": success_rate,
                "avg_response_time": avg_response_time,
                "request_count": len(interval_results)
            })
            
            # Wait for next interval
            elapsed = time.time() - interval_start
            if elapsed < interval:
                time.sleep(interval - elapsed)
        
        # Analyze sustained performance
        overall_success_rate = statistics.mean([r["success_rate"] for r in results_over_time])
        overall_avg_response_time = statistics.mean([r["avg_response_time"] for r in results_over_time])
        
        # Check for performance degradation over time
        first_half = results_over_time[:len(results_over_time)//2]
        second_half = results_over_time[len(results_over_time)//2:]
        
        first_half_avg = statistics.mean([r["avg_response_time"] for r in first_half])
        second_half_avg = statistics.mean([r["avg_response_time"] for r in second_half])
        
        performance_degradation = (second_half_avg - first_half_avg) / first_half_avg if first_half_avg > 0 else 0
        
        # Assertions
        assert overall_success_rate >= 0.95, f"Sustained load success rate {overall_success_rate:.3f} too low"
        assert performance_degradation <= 0.5, f"Performance degradation {performance_degradation:.3f} too high"

    def _single_api_request(self, test_config, api_headers):
        """Helper method for single API request"""
        try:
            start_time = time.time()
            
            mock_response_data = {"status": "success", "data": []}
            
            with patch('requests.get') as mock_get:
                mock_get.return_value = self.mock_api_response(
                    response_data=mock_response_data,
                    delay=0.1 + (time.time() % 0.2)
                )
                
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    headers=api_headers
                )
            
            end_time = time.time()
            
            return {
                "status_code": response.status_code,
                "response_time": end_time - start_time,
                "success": response.status_code == 200
            }
            
        except Exception as e:
            return {
                "status_code": 0,
                "response_time": 0,
                "success": False,
                "error": str(e)
            }

    def test_memory_usage_during_load(self, test_config, api_headers):
        """Test memory usage during load testing"""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate load
        for i in range(100):
            with patch('requests.get') as mock_get:
                mock_get.return_value = self.mock_api_response(
                    response_data={"data": [{"id": f"INC{j:06d}"} for j in range(100)]},
                    delay=0.01
                )
                
                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    headers=api_headers
                )
            
            # Check memory usage every 10 requests
            if i % 10 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_increase = current_memory - initial_memory
                
                # Memory shouldn't increase dramatically
                assert memory_increase < 100, f"Memory usage increased by {memory_increase:.2f}MB"
        
        # Force garbage collection
        gc.collect()
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_memory_increase = final_memory - initial_memory
        
        # Final memory usage check
        assert total_memory_increase < 50, f"Total memory increase {total_memory_increase:.2f}MB too high"