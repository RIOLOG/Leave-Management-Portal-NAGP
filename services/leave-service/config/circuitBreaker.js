require('colors')

const CircuitBreaker = require('opossum');
const axios = require('axios');
const { bgCyan } = require('colors');


const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL
  || 'http://localhost:3002';


// ─── Circuit Breaker Options ───────────────────────────
const CB_OPTIONS = {
  timeout: 3000,                // 3 seconds max wait
  errorThresholdPercentage: 50, // open if 50% requests fail
  resetTimeout: 10000,          // try again after 10 seconds
  volumeThreshold: 3            // min 3 requests before opening
};


// ─── Wrapped HTTP calls ────────────────────────────────

// Check leave balance
const checkBalanceCall = async ({ employeeId, leaveType, token }) => {
  const response = await axios.get(
    `${EMPLOYEE_SERVICE_URL}/employees/${employeeId}/balance`,
    {
      headers: { authorization: token },
      timeout: 3000
    }
  );
  return response.data;
};


// Deduct leave balance
const deductBalanceCall = async ({ employeeId, leaveType, days }) => {
  const response = await axios.put(
    `${EMPLOYEE_SERVICE_URL}/employees/${employeeId}/balance/deduct`,
    { leaveType, days },
    { timeout: 3000 }
  );
  return response.data;
};


// Restore leave balance (saga compensation)
const restoreBalanceCall = async ({ employeeId, leaveType, days }) => {
  const response = await axios.put(
    `${EMPLOYEE_SERVICE_URL}/employees/${employeeId}/balance/restore`,
    { leaveType, days },
    { timeout: 3000 }
  );
  return response.data;
};



// ─── Create Circuit Breakers ───────────────────────────
const checkBalanceCB = new CircuitBreaker(checkBalanceCall, CB_OPTIONS);
const deductBalanceCB = new CircuitBreaker(deductBalanceCall, CB_OPTIONS);
const restoreBalanceCB = new CircuitBreaker(restoreBalanceCall, CB_OPTIONS);



// ─── Fallback functions ────────────────────────────────
checkBalanceCB.fallback(() => {
  console.log('Circuit open: using fallback for balance check'.bgCyan);
  return {
    success: false,
    fallback: true,
    message: 'Employee Service unavailable — cannot check balance'
  };
});

deductBalanceCB.fallback(() => {
  console.log('Circuit open: using fallback for balance deduction'.bgCyan);
  return {
    success: false,
    fallback: true,
    message: 'Employee Service unavailable — cannot deduct balance'
  };
});

restoreBalanceCB.fallback(() => {
  console.log('Circuit open: using fallback for balance restore'.bgCyan);
  return {
    success: false,
    fallback: true,
    message: 'Employee Service unavailable — cannot restore balance'
  };
});


// ─── Circuit Breaker event logging ────────────────────
[checkBalanceCB, deductBalanceCB, restoreBalanceCB].forEach(cb => {
  cb.on('open', () =>
    console.log(' Circuit OPENED — Employee Service failing'.bgCyan)
  );
  cb.on('halfOpen', () =>
    console.log('Circuit HALF-OPEN — testing Employee Service'.bgCyan)
  );
  cb.on('close', () =>
    console.log('🟢 Circuit CLOSED — Employee Service recovered'.bgCyan)
  );
  cb.on('fallback', () =>
    console.log(' Fallback triggered'.bgCyan)
  );
});

module.exports = {
  checkBalanceCB,
  deductBalanceCB,
  restoreBalanceCB
};