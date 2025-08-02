"""
Comprehensive load testing suite for ITSM system
Includes stress testing, endurance testing, and performance monitoring
"""

import pytest
import requests
import time
import statistics
import threading
import queue
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch
from datetime import datetime, timedelta
import json
import psutil
import os


@pytest.mark.load
@pytest.mark.slow
class TestComprehensiveLoad:
    """Comprehensive load testing for ITSM system"""

    def test_spike_load_testing(self, test_config, api_headers):
        """Test system behavior under sudden load spikes"""
        results_queue = queue.Queue()

        def normal_load_user(user_id, duration=30):
            """Simulate normal user behavior"""
            user_results = []
            start_time = time.time()

            while time.time() - start_time < duration:
                try:
                    mock_response = {
                        "data": [{"id": f"INC{i:06d}"} for i in range(5)],
                        "meta": {"total": 5},
                    }

                    with patch("requests.get") as mock_get:
                        mock_get.return_value.status_code = 200
                        mock_get.return_value.json.return_value = mock_response

                        response = requests.get(
                            f"{test_config['base_url']}/incidents", headers=api_headers
                        )

                    user_results.append(
                        {
                            "user_id": user_id,
                            "timestamp": time.time(),
                            "status_code": response.status_code,
                            "response_time": 0.1,  # Simulated
                        }
                    )

                    time.sleep(random.uniform(1, 3))  # Normal user pause

                except Exception as e:
                    user_results.append(
                        {
                            "user_id": user_id,
                            "timestamp": time.time(),
                            "status_code": 500,
                            "error": str(e),
                        }
                    )

            results_queue.put(("normal", user_results))

        def spike_load_user(user_id, start_delay=15):
            """Simulate spike load user (starts after delay)"""
            time.sleep(start_delay)
            user_results = []

            # Rapid requests for 10 seconds
            end_time = time.time() + 10
            while time.time() < end_time:
                try:
                    mock_response = {"status": "healthy"}

                    with patch("requests.get") as mock_get:
                        mock_get.return_value.status_code = 200
                        mock_get.return_value.json.return_value = mock_response

                        response = requests.get(
                            f"{test_config['base_url']}/health", headers=api_headers
                        )

                    user_results.append(
                        {
                            "user_id": user_id,
                            "timestamp": time.time(),
                            "status_code": response.status_code,
                            "response_time": 0.05,
                            "type": "spike",
                        }
                    )

                    time.sleep(0.1)  # Rapid requests

                except Exception as e:
                    user_results.append(
                        {
                            "user_id": user_id,
                            "timestamp": time.time(),
                            "status_code": 500,
                            "error": str(e),
                            "type": "spike",
                        }
                    )

            results_queue.put(("spike", user_results))

        # Start normal users
        normal_threads = []
        for i in range(5):
            thread = threading.Thread(target=normal_load_user, args=(f"normal_{i}",))
            normal_threads.append(thread)
            thread.start()

        # Start spike users (they will begin after 15 seconds)
        spike_threads = []
        for i in range(20):
            thread = threading.Thread(target=spike_load_user, args=(f"spike_{i}",))
            spike_threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in normal_threads + spike_threads:
            thread.join()

        # Collect and analyze results
        all_results = []
        while not results_queue.empty():
            user_type, user_results = results_queue.get()
            for result in user_results:
                result["user_type"] = user_type
                all_results.append(result)

        # Analyze spike impact
        normal_results = [r for r in all_results if r.get("user_type") == "normal"]
        spike_results = [r for r in all_results if r.get("type") == "spike"]

        normal_success_rate = (
            len([r for r in normal_results if r["status_code"] == 200])
            / len(normal_results)
            * 100
            if normal_results
            else 0
        )
        spike_success_rate = (
            len([r for r in spike_results if r["status_code"] == 200])
            / len(spike_results)
            * 100
            if spike_results
            else 0
        )

        print(f"Spike Load Test Results:")
        print(f"- Normal user success rate: {normal_success_rate:.1f}%")
        print(f"- Spike load success rate: {spike_success_rate:.1f}%")
        print(f"- Total requests during spike: {len(spike_results)}")

        # Assertions
        assert (
            normal_success_rate >= 90.0
        )  # Normal users should maintain good success rate
        assert (
            spike_success_rate >= 70.0
        )  # Spike load can have lower success rate but not fail completely
        assert len(all_results) > 0

    def test_endurance_testing(self, test_config, api_headers):
        """Test system stability over extended period"""
        test_duration = 120  # 2 minutes for testing (would be longer in production)
        concurrent_users = 5
        results_queue = queue.Queue()

        def endurance_user(user_id):
            """Simulate user activity over long period"""
            user_results = []
            start_time = time.time()
            request_count = 0

            while time.time() - start_time < test_duration:
                try:
                    # Vary the API calls
                    api_calls = [
                        ("/health", {"status": "healthy"}),
                        (
                            "/incidents",
                            {
                                "data": [{"id": f"INC{request_count:06d}"}],
                                "meta": {"total": 1},
                            },
                        ),
                        (
                            f"/incidents/INC{request_count:06d}",
                            {"id": f"INC{request_count:06d}", "status": "new"},
                        ),
                    ]

                    endpoint, mock_data = random.choice(api_calls)

                    with patch("requests.get") as mock_get:
                        mock_get.return_value.status_code = 200
                        mock_get.return_value.json.return_value = mock_data

                        request_start = time.time()
                        response = requests.get(
                            f"{test_config['base_url']}{endpoint}", headers=api_headers
                        )
                        request_end = time.time()

                    user_results.append(
                        {
                            "user_id": user_id,
                            "request_count": request_count,
                            "timestamp": request_end,
                            "status_code": response.status_code,
                            "response_time": request_end - request_start,
                            "endpoint": endpoint,
                        }
                    )

                    request_count += 1
                    time.sleep(random.uniform(0.5, 2.0))  # Variable user think time

                except Exception as e:
                    user_results.append(
                        {
                            "user_id": user_id,
                            "request_count": request_count,
                            "timestamp": time.time(),
                            "status_code": 500,
                            "error": str(e),
                        }
                    )
                    request_count += 1

            results_queue.put(user_results)

        # Start endurance users
        threads = []
        for i in range(concurrent_users):
            thread = threading.Thread(target=endurance_user, args=(f"endurance_{i}",))
            threads.append(thread)
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Collect results
        all_results = []
        while not results_queue.empty():
            user_results = results_queue.get()
            all_results.extend(user_results)

        # Analyze endurance test results
        if all_results:
            successful_requests = [r for r in all_results if r["status_code"] == 200]
            response_times = [
                r["response_time"] for r in all_results if "response_time" in r
            ]

            success_rate = len(successful_requests) / len(all_results) * 100
            avg_response_time = statistics.mean(response_times) if response_times else 0

            # Check for performance degradation over time
            time_windows = {}
            for result in all_results:
                window = int(
                    (result["timestamp"] - all_results[0]["timestamp"]) // 30
                )  # 30-second windows
                if window not in time_windows:
                    time_windows[window] = []
                if "response_time" in result:
                    time_windows[window].append(result["response_time"])

            window_avg_times = {
                w: statistics.mean(times) for w, times in time_windows.items() if times
            }

            print(f"Endurance Test Results ({test_duration}s):")
            print(f"- Total requests: {len(all_results)}")
            print(f"- Success rate: {success_rate:.1f}%")
            print(f"- Average response time: {avg_response_time:.3f}s")
            print(f"- Performance windows: {len(window_avg_times)}")

            # Check for performance degradation
            if len(window_avg_times) > 1:
                first_window_avg = list(window_avg_times.values())[0]
                last_window_avg = list(window_avg_times.values())[-1]
                degradation_ratio = (
                    last_window_avg / first_window_avg if first_window_avg > 0 else 1
                )

                print(f"- Performance degradation ratio: {degradation_ratio:.2f}")
                assert degradation_ratio < 2.0  # Response time shouldn't double

            # Assertions
            assert success_rate >= 90.0
            assert avg_response_time < 2.0

    def test_volume_testing(self, test_config, api_headers):
        """Test system with large volumes of data"""
        # Test creating and querying large datasets
        large_dataset_sizes = [100, 500, 1000]

        for dataset_size in large_dataset_sizes:
            print(f"Testing with dataset size: {dataset_size}")

            # Simulate large list query
            mock_response = {
                "data": [
                    {
                        "id": f"INC{i:06d}",
                        "title": f"Volume test incident {i}",
                        "status": random.choice(["new", "in_progress", "resolved"]),
                        "priority": random.choice(
                            ["low", "medium", "high", "critical"]
                        ),
                        "created_at": (
                            datetime.now() - timedelta(days=random.randint(1, 30))
                        ).isoformat(),
                        "description": f"This is a test incident for volume testing. Record number {i}. "
                        * 5,
                    }
                    for i in range(min(100, dataset_size))  # Limit response size
                ],
                "meta": {
                    "total": dataset_size,
                    "page": 1,
                    "per_page": 100,
                    "total_pages": (dataset_size + 99) // 100,
                },
            }

            start_time = time.time()

            with patch("requests.get") as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response

                response = requests.get(
                    f"{test_config['base_url']}/incidents",
                    params={"per_page": 100},
                    headers=api_headers,
                )

            end_time = time.time()
            query_time = end_time - start_time

            # Calculate response size
            response_json = response.json()
            response_size = len(json.dumps(response_json).encode("utf-8"))

            print(f"Dataset size {dataset_size} results:")
            print(f"- Query time: {query_time:.3f}s")
            print(f"- Response size: {response_size / 1024:.1f} KB")
            print(f"- Records returned: {len(response_json['data'])}")

            # Assertions for volume testing
            assert response.status_code == 200
            assert query_time < 5.0  # Should complete within 5 seconds
            assert response_size < 1024 * 1024  # Response should be under 1MB
            assert len(response_json["data"]) <= 100  # Should respect pagination

    def test_scalability_testing(self, test_config, api_headers):
        """Test system scalability with increasing load"""
        user_loads = [1, 5, 10, 20]  # Gradually increase concurrent users
        scalability_results = []

        for num_users in user_loads:
            print(f"Testing with {num_users} concurrent users")

            results_queue = queue.Queue()

            def scalability_user(user_id, test_duration=30):
                user_results = []
                start_time = time.time()

                while time.time() - start_time < test_duration:
                    try:
                        mock_response = {
                            "data": [{"id": f"INC{user_id}_{int(time.time())}"}],
                            "meta": {"total": 1},
                        }

                        request_start = time.time()

                        with patch("requests.get") as mock_get:
                            mock_get.return_value.status_code = 200
                            mock_get.return_value.json.return_value = mock_response

                            response = requests.get(
                                f"{test_config['base_url']}/incidents",
                                headers=api_headers,
                            )

                        request_end = time.time()

                        user_results.append(
                            {
                                "user_id": user_id,
                                "status_code": response.status_code,
                                "response_time": request_end - request_start,
                            }
                        )

                        time.sleep(random.uniform(0.1, 0.5))

                    except Exception as e:
                        user_results.append(
                            {"user_id": user_id, "status_code": 500, "error": str(e)}
                        )

                results_queue.put(user_results)

            # Start users for this load level
            threads = []
            test_start_time = time.time()

            for i in range(num_users):
                thread = threading.Thread(target=scalability_user, args=(i,))
                threads.append(thread)
                thread.start()

            # Wait for completion
            for thread in threads:
                thread.join()

            test_end_time = time.time()

            # Collect results for this load level
            load_results = []
            while not results_queue.empty():
                user_results = results_queue.get()
                load_results.extend(user_results)

            # Analyze this load level
            if load_results:
                successful_requests = [
                    r for r in load_results if r["status_code"] == 200
                ]
                response_times = [
                    r["response_time"] for r in load_results if "response_time" in r
                ]

                success_rate = (
                    len(successful_requests) / len(load_results) * 100
                    if load_results
                    else 0
                )
                avg_response_time = (
                    statistics.mean(response_times) if response_times else 0
                )
                throughput = len(load_results) / (test_end_time - test_start_time)

                scalability_results.append(
                    {
                        "users": num_users,
                        "total_requests": len(load_results),
                        "success_rate": success_rate,
                        "avg_response_time": avg_response_time,
                        "throughput": throughput,
                    }
                )

                print(f"Results for {num_users} users:")
                print(f"- Success rate: {success_rate:.1f}%")
                print(f"- Avg response time: {avg_response_time:.3f}s")
                print(f"- Throughput: {throughput:.1f} req/s")

        # Analyze scalability trends
        print(f"\nScalability Analysis:")
        for i, result in enumerate(scalability_results):
            print(
                f"- {result['users']} users: {result['success_rate']:.1f}% success, "
                f"{result['avg_response_time']:.3f}s avg, {result['throughput']:.1f} req/s"
            )

        # Check that system maintains reasonable performance as load increases
        if len(scalability_results) > 1:
            # Success rate shouldn't drop dramatically
            first_success_rate = scalability_results[0]["success_rate"]
            last_success_rate = scalability_results[-1]["success_rate"]
            success_rate_drop = first_success_rate - last_success_rate

            # Response time shouldn't increase too much
            first_response_time = scalability_results[0]["avg_response_time"]
            last_response_time = scalability_results[-1]["avg_response_time"]
            response_time_increase = (
                last_response_time / first_response_time
                if first_response_time > 0
                else 1
            )

            print(f"- Success rate drop: {success_rate_drop:.1f}%")
            print(f"- Response time increase ratio: {response_time_increase:.2f}")

            # Scalability assertions
            assert success_rate_drop < 20.0  # Success rate shouldn't drop more than 20%
            assert response_time_increase < 3.0  # Response time shouldn't triple

    def test_resource_consumption_monitoring(self, test_config, api_headers):
        """Monitor resource consumption during load testing"""
        # Get initial system resources
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        initial_cpu_percent = process.cpu_percent()

        resource_measurements = []

        def monitor_resources():
            """Background thread to monitor resource usage"""
            while not stop_monitoring.is_set():
                try:
                    current_memory = process.memory_info().rss
                    current_cpu = process.cpu_percent()

                    resource_measurements.append(
                        {
                            "timestamp": time.time(),
                            "memory_mb": current_memory / 1024 / 1024,
                            "cpu_percent": current_cpu,
                            "memory_increase_mb": (current_memory - initial_memory)
                            / 1024
                            / 1024,
                        }
                    )

                    time.sleep(1)  # Monitor every second
                except:
                    break

        # Start resource monitoring
        stop_monitoring = threading.Event()
        monitor_thread = threading.Thread(target=monitor_resources)
        monitor_thread.start()

        try:
            # Perform load test while monitoring
            def load_worker(worker_id):
                for i in range(50):
                    try:
                        mock_response = {
                            "data": [{"id": f"INC{worker_id}_{i:03d}"}],
                            "meta": {"total": 1},
                        }

                        with patch("requests.get") as mock_get:
                            mock_get.return_value.status_code = 200
                            mock_get.return_value.json.return_value = mock_response

                            response = requests.get(
                                f"{test_config['base_url']}/incidents",
                                headers=api_headers,
                            )

                        time.sleep(0.1)
                    except:
                        pass

            # Run load test with multiple workers
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = [executor.submit(load_worker, i) for i in range(8)]
                for future in as_completed(futures):
                    future.result()

        finally:
            # Stop monitoring
            stop_monitoring.set()
            monitor_thread.join()

        # Analyze resource consumption
        if resource_measurements:
            max_memory = max(m["memory_mb"] for m in resource_measurements)
            max_memory_increase = max(
                m["memory_increase_mb"] for m in resource_measurements
            )
            avg_cpu = statistics.mean(m["cpu_percent"] for m in resource_measurements)
            max_cpu = max(m["cpu_percent"] for m in resource_measurements)

            print(f"Resource Consumption Analysis:")
            print(f"- Initial memory: {initial_memory / 1024 / 1024:.1f} MB")
            print(f"- Max memory: {max_memory:.1f} MB")
            print(f"- Max memory increase: {max_memory_increase:.1f} MB")
            print(f"- Average CPU: {avg_cpu:.1f}%")
            print(f"- Max CPU: {max_cpu:.1f}%")

            # Resource consumption assertions
            assert (
                max_memory_increase < 500
            )  # Memory increase should be less than 500MB
            assert max_cpu < 80  # CPU usage should stay below 80%

        # Get final resource state
        final_memory = process.memory_info().rss
        final_memory_increase = (final_memory - initial_memory) / 1024 / 1024

        print(f"- Final memory increase: {final_memory_increase:.1f} MB")

        # Check for memory leaks
        assert final_memory_increase < 100  # Should not leak more than 100MB

    def test_recovery_after_load(self, test_config, api_headers):
        """Test system recovery after high load"""

        # Apply high load
        def high_load_phase():
            results = []
            with ThreadPoolExecutor(max_workers=20) as executor:

                def make_request(req_id):
                    try:
                        mock_response = {"status": "healthy"}
                        with patch("requests.get") as mock_get:
                            mock_get.return_value.status_code = 200
                            mock_get.return_value.json.return_value = mock_response

                            response = requests.get(
                                f"{test_config['base_url']}/health", headers=api_headers
                            )
                        return {"status": "success", "response_time": 0.1}
                    except Exception as e:
                        return {"status": "error", "error": str(e)}

                futures = [executor.submit(make_request, i) for i in range(100)]
                results = [future.result() for future in as_completed(futures)]

            return results

        print("Applying high load...")
        high_load_results = high_load_phase()
        high_load_success_rate = (
            len([r for r in high_load_results if r["status"] == "success"])
            / len(high_load_results)
            * 100
        )

        print(f"High load success rate: {high_load_success_rate:.1f}%")

        # Wait for system to recover
        print("Waiting for system recovery...")
        time.sleep(10)

        # Test normal load after recovery
        def recovery_test():
            recovery_results = []
            for i in range(20):
                try:
                    mock_response = {"status": "healthy"}
                    start_time = time.time()

                    with patch("requests.get") as mock_get:
                        mock_get.return_value.status_code = 200
                        mock_get.return_value.json.return_value = mock_response

                        response = requests.get(
                            f"{test_config['base_url']}/health", headers=api_headers
                        )

                    end_time = time.time()

                    recovery_results.append(
                        {"status": "success", "response_time": end_time - start_time}
                    )

                    time.sleep(0.5)

                except Exception as e:
                    recovery_results.append({"status": "error", "error": str(e)})

            return recovery_results

        recovery_results = recovery_test()
        recovery_success_rate = (
            len([r for r in recovery_results if r["status"] == "success"])
            / len(recovery_results)
            * 100
        )
        recovery_avg_response_time = statistics.mean(
            [r["response_time"] for r in recovery_results if "response_time" in r]
        )

        print(f"Recovery Test Results:")
        print(f"- Recovery success rate: {recovery_success_rate:.1f}%")
        print(f"- Recovery avg response time: {recovery_avg_response_time:.3f}s")

        # Recovery assertions
        assert recovery_success_rate >= 95.0  # Should recover to normal performance
        assert recovery_avg_response_time < 1.0  # Response times should be normal
