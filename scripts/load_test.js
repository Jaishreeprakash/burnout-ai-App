import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export default function () {
  // 1. Health check
  let res = http.get(`${BASE_URL}/health`);
  check(res, { 'status is 200': (r) => r.status === 200 });

  // 2. Root endpoint
  res = http.get(`${BASE_URL}/`);
  check(res, { 'status is 200': (r) => r.status === 200 });

  // 3. Unauthenticated recommendations
  res = http.get(`${BASE_URL}/api/v1/recommendations/quick`);
  check(res, { 'status is 200': (r) => r.status === 200 });

  sleep(1);
}
