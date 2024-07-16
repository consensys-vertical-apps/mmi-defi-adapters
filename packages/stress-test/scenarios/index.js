export const scenarios = {
  single: {
    iterations: 1,
    vus: 1,
  },
  default: {
    iterations: 1,
    vus: 1,
  },
  fifty_requests: {
    vus: 50, // 50 Virtual Users
    iterations: 50, // 50 iterations to match the VUs
  },
}
