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

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL
  || 'http://localhost:3002';


// ─── Main Saga Function ────────────────────────────────
const runApprovalSaga = async (leave, managerId) => {
  const sagaLog = [];

  console.log(`\n APPROVAL SAGA STARTED — Leave #${leave._id}`.bgGreen.white);

  try {

    // ── STEP 1: Update leave status to approved ────────
    sagaLog.push({ step: 1, action: 'updateLeaveStatus', status: 'started' });

    leave.status = 'approved';
    leave.actionBy = managerId;
    leave.actionAt = new Date();
    await leave.save();

    sagaLog.push({ step: 1, action: 'updateLeaveStatus', status: 'success' });
    console.log(`Step 1: Leave status updated to approved`.green);

    // ── STEP 2: Deduct leave balance ───────────────────
    sagaLog.push({ step: 2, action: 'deductLeaveBalance', status: 'started' });

    await axios.put(
      `${EMPLOYEE_SERVICE_URL}/employees/${leave.employeeId}/balance/deduct`,
      {
        leaveType: leave.leaveType,
        days: leave.numberOfDays
      }
    );

    sagaLog.push({ step: 2, action: 'deductLeaveBalance', status: 'success' });
    console.log(` Step 2: Leave balance deducted — ${leave.numberOfDays} ${leave.leaveType} days`.green);

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

    console.log(`APPROVAL SAGA COMPLETED — Leave #${leave._id}\n`);

    return {
      success: true,
      leave,
      sagaLog
    };

  } catch (error) {

    // ── COMPENSATION ───────────────────────────────────
    console.log(`\nSAGA FAILED: ${error.message}`);
    console.log(` Running compensations...`);

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

      } catch (compensateError) {
        console.error(` Compensation failed:`, compensateError.message.bgRed);
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