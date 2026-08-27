import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, HEADERS } from "../config.js";

export const options = {
    stages: [
        { duration: "5s", target: 10 },  // Ramp up to 10 users
        { duration: "15s", target: 30 }, // Spike to 30 users (will trigger rate limiter)
        { duration: "5s", target: 0 },   // Ramp down
    ],
    thresholds: {
        // 500 Internal Server Errors should NEVER happen
        "http_req_failed{status:500}": ["rate==0"],
    },
};

export default function () {
    const payload = JSON.stringify({
        email: "harshitclub@gmail.com",
        password: "Harshit@123",
    });

    const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
        headers: HEADERS,
    });


    // Verify that responses are valid HTTP codes (200, 401, or 429)
    check(res, {
        "status is 200, 401, or 429": (r) =>
            r.status === 200 || r.status === 401 || r.status === 429,
    });



    sleep(0.1); // Small 100ms pause between requests per VU

}