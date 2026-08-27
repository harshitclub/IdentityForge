import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL } from "../config.js";

export const options = {
  vus: 1,
  duration: "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"], // Less than 1% errors
    http_req_duration: ["p(95)<50"], // 95% of requests should be below 50ms
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/system/live`);
  check(res, {
    "live status is 200": (r) => r.status === 200,
    "response has success true": (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
  });
  sleep(1);
}