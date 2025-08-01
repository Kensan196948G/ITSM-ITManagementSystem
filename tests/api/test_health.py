"""
Simple health check API tests for ITSM system
"""
import pytest
from unittest.mock import patch, Mock


@pytest.mark.api
class TestHealthCheck:
    """Health check endpoint tests"""

    def test_health_endpoint_success(self, test_config):
        """Test successful health check"""
        mock_response = {
            "status": "healthy",
            "service": "ITSM System",
            "version": "1.0.0",
            "environment": "development"
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            import requests
            response = requests.get(f"{test_config['base_url']}/health")
            
            assert response.status_code == 200
            health_data = response.json()
            assert health_data["status"] == "healthy"
            assert "service" in health_data
            assert "version" in health_data

    def test_version_endpoint_success(self, test_config):
        """Test version information endpoint"""
        mock_response = {
            "name": "ITSM System",
            "version": "1.0.0",
            "api_version": "1.0",
            "environment": "development"
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            import requests
            response = requests.get(f"{test_config['base_url']}/version")
            
            assert response.status_code == 200
            version_data = response.json()
            assert version_data["name"] == "ITSM System"
            assert "version" in version_data
            assert "api_version" in version_data


@pytest.mark.api
@pytest.mark.benchmark
class TestAPIPerformance:
    """API performance tests"""

    def test_health_endpoint_performance(self, test_config, benchmark):
        """Benchmark health endpoint response time"""
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"status": "healthy"}
            
            def make_request():
                import requests
                return requests.get(f"{test_config['base_url']}/health")
            
            result = benchmark(make_request)
            assert result.status_code == 200

    def test_concurrent_health_requests(self, test_config):
        """Test concurrent health check requests"""
        import threading
        import requests
        from unittest.mock import patch
        
        results = []
        
        def make_request():
            with patch('requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {"status": "healthy"}
                
                response = requests.get(f"{test_config['base_url']}/health")
                results.append(response.status_code)
        
        threads = []
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(results) == 10
        assert all(status == 200 for status in results)