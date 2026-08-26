import http from "k6/http";
import { check } from "k6";

const BASE_URL = "http://localhost:5000";

export const options = {
  vus: 1,
  iterations: 10,
};

export default function () {
  const response = http.get(`${BASE_URL}/system/live`);
  check(response, {
    "status is 200": (res) => res.status === 200,
    "response is JSON": (res) =>
      res.headers["Content-Type"]?.includes("application/json"),
  });
}
