// What Saga does for leave approval:
// Step 1 → Update leave status to 'approved'
// Step 2 → Deduct leave balance (Employee Service)
// Step 3 → Publish leave.approved event (notify employee)

// Failure scenarios:
// If Step 2 fails:
// → Compensate Step 1 → revert status to 'pending'
// → Publish leave.failed event

// If Step 3 fails:
// → Leave still approved (non-critical)
// → Just log warning


require('colors');
const axios = require('axios');
const Leave = require('../models/Leave');
const { publishEvent } = require('./rabbitmq');
const { deductBalanceCB, restoreBalanceCB } = require('./circuitBreaker');
const { createLogger } = require('./logger');
const logger = createLogger('leave-service');


const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL
  || 'http://localhost:3002';



// ─── Main Saga Function ────────────────────────────────
const runApprovalSaga = async (leave, managerId) => {
  const sagaLog = [];

  console.log(`\n APPROVAL SAGA STARTED — Leave #${leave._id}`.bgGreen.white);
  logger.info(`Starting approval saga for Leave #${leave._id} by Manager #${managerId}`);

  try {

    // ── STEP 1: Update leave status to approved ────────
    sagaLog.push({ step: 1, action: 'updateLeaveStatus', status: 'started' });


    leave.status = 'approved';
    leave.actionBy = managerId;
    leave.actionAt = new Date();
    await leave.save();

    sagaLog.push({ step: 1, action: 'updateLeaveStatus', status: 'success' });
    console.log(`Step 1: Leave status updated to approved`.green);
    logger.info(`Leave #${leave._id} status updated to approved by Manager #${managerId}`);

    // ── STEP 2: Deduct leave balance ───────────────────
    sagaLog.push({ step: 2, action: 'deductLeaveBalance', status: 'started' });

    //without circuit breaker
    // await axios.put(
    //   `${EMPLOYEE_SERVICE_URL}/employees/${leave.employeeId}/balance/deduct`,
    //   {
    //     leaveType: leave.leaveType,
    //     days: leave.numberOfDays
    //   }
    // );


    //with circuit breaker
    const deductResult = await deductBalanceCB.fire({
      employeeId: leave.employeeId,
      leaveType: leave.leaveType,
      days: leave.numberOfDays
    });

    if (deductResult.fallback) {
      throw new Error('Employee Service unavailable — cannot deduct balance');
    }

    sagaLog.push({ step: 2, action: 'deductLeaveBalance', status: 'success' });
    console.log(` Step 2: Leave balance deducted — ${leave.numberOfDays} ${leave.leaveType} days`.green);
    logger.info(`Leave #${leave._id} balance deducted — ${leave.numberOfDays} ${leave.leaveType} days`);

    
    // ── STEP 3: Notify employee ─────────
    publishEvent('leave.approved', {
      leaveId: leave._id,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      managerId: leave.managerId,
      leaveType: leave.leaveType,
      numberOfDays: leave.numberOfDays,
      startDate: leave.startDate,
      endDate: leave.endDate
    });

    sagaLog.push({ step: 3, action: 'notifyEmployee', status: 'success' });
    console.log(`Step 3: Approval notification published`.bgMagenta);
    logger.info(`Leave #${leave._id} approval notification published`);

    console.log(`APPROVAL SAGA COMPLETED — Leave #${leave._id}\n`);
    logger.info(`Approval saga completed successfully for Leave #${leave._id}`);

    return {
      success: true,
      leave,
      sagaLog
    };

  } catch (error) {

    // ── COMPENSATION ───────────────────────────────────
    console.log(`\nSAGA FAILED: ${error.message}`);
    console.log(` Running compensations...`);
    logger.error(`Saga failed for Leave #${leave._id}: ${error.message}. Starting compensation.`);

    sagaLog.push({
      action: 'compensation',
      reason: error.message
    });

    // Compensate Step 1 — revert leave status to pending
    const step1Done = sagaLog.find(
      l => l.step === 1 && l.status === 'success'
    );

    if (step1Done) {
      try {
        leave.status = 'pending';
        leave.actionBy = null;
        leave.actionAt = null;
        await leave.save();

        sagaLog.push({
          step: 1,
          action: 'revertLeaveStatus',
          status: 'compensated'
        });
        console.log(` COMPENSATION: Leave status reverted to pending`.bgYellow);
        logger.info(`Compensation successful: Leave #${leave._id} status reverted to pending`);

      } catch (compensateError) {
        console.error(` Compensation failed:`, compensateError.message.bgRed);
        logger.error(`Compensation failed for Leave #${leave._id}: ${compensateError.message}`);  
      }
    }

    // Publish failure notification
    publishEvent('leave.approval.failed', {
      leaveId: leave._id,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      managerId,
      reason: error.message
    });

    console.log(` SAGA COMPENSATED — Leave #${leave._id} reverted\n`.bgYellow);
    logger.info(`Saga compensated for Leave #${leave._id}. Failure event published.`);

    return {
      success: false,
      leave,
      sagaLog,
      error: error.message
    };
  }
};

module.exports = { runApprovalSaga };



// Manager calls PUT /leaves/:id/approve
//           ↓
// runApprovalSaga(leave, managerId)
//           ↓
// Step 1 → leave.status = 'approved' → save ✅
//           ↓
// Step 2 → call Employee Service
//          PUT /employees/:id/balance/deduct
//               ↓
//          Success → balance deducted ✅
//          Failure → COMPENSATION:
//                    → revert leave to 'pending' ✅
//                    → publish failure event ✅
//                    → return error to manager ✅
//           ↓
// Step 3 → publishEvent('leave.approved') ✅
//          (non-critical — failure doesn't trigger compensation)
//           ↓
// Return success to manager ✅