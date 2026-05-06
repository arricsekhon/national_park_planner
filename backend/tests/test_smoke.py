import os
import unittest

from fastapi.testclient import TestClient

from main import app


class ApiSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_root_returns_api_message(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "National Parks Hiker Planner API")

    def test_weather_reports_unavailable_without_api_key(self) -> None:
        original_key = os.environ.pop("OPENWEATHER_API_KEY", None)
        try:
            response = self.client.get("/weather?lat=37.8651&lon=-119.5383")
        finally:
            if original_key is not None:
                os.environ["OPENWEATHER_API_KEY"] = original_key

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"available": False})

    def test_parks_requires_nps_api_key(self) -> None:
        original_key = os.environ.pop("NPS_API_KEY", None)
        try:
            response = self.client.get("/parks")
        finally:
            if original_key is not None:
                os.environ["NPS_API_KEY"] = original_key

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "NPS_API_KEY not configured")


if __name__ == "__main__":
    unittest.main()
