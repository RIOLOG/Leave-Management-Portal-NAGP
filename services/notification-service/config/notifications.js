require('colors'); 

const { createLogger } = require('../../../shared/config/logger');

const logger = createLogger('notification-service');


// ─── Process each notification type ───────────────────
const processNotification = async (eventType, data) => {
  switch (eventType) {

    // ── Leave Applied ──────────────────────────────────
    case 'leave.applied':
      logger.info('Leave application submitted', { employeeName: data.employeeName, leaveType: data.leaveType, numberOfDays: data.numberOfDays });
      console.log('─────────────────────────────────────');
      console.log('📋 NOTIFICATION: Leave Application'.bgGreen);
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Message     : Your ${data.leaveType} leave application`);
      console.log(`                 for ${data.numberOfDays} day(s)`);
      console.log(`                 (${formatDate(data.startDate)} to ${formatDate(data.endDate)})`);
      console.log(`                 has been submitted successfully.`);
      console.log(`                 Status: PENDING ⏳`);
      console.log('─────────────────────────────────────');
      console.log('📋 NOTIFICATION: Pending Approval'.bgyellow);
      console.log(`   To Manager  : Manager (ID: ${data.managerId})`);
      console.log(`   Message     : ${data.employeeName} has applied for`);
      console.log(`                 ${data.numberOfDays} day(s) ${data.leaveType} leave.`);
      console.log(`                 Please review and take action.`);
      console.log('─────────────────────────────────────');
      break;


    // ── Leave Approved ────────────────────────────────
    case 'leave.approved':
      logger.info('Leave application approved', { employeeName: data.employeeName, leaveType: data.leaveType, numberOfDays: data.numberOfDays });
      console.log('─────────────────────────────────────');
      console.log('✅ NOTIFICATION: Leave Approved'.bggreen);
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Message     : Your ${data.leaveType} leave application`);
      console.log(`                 for ${data.numberOfDays} day(s)`);
      console.log(`                 (${formatDate(data.startDate)} to ${formatDate(data.endDate)})`);
      console.log(`                 has been APPROVED! ✅`);
      console.log(`                 Enjoy your time off!`);
      console.log('─────────────────────────────────────');
      break;


    // ── Leave Rejected ────────────────────────────────
    case 'leave.rejected':
      logger.info('Leave application rejected', { employeeName: data.employeeName, leaveType: data.leaveType, numberOfDays: data.numberOfDays, reason: data.reason });
      console.log('─────────────────────────────────────');
      console.log('❌ NOTIFICATION: Leave Rejected'.bgRed);
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Message     : Your ${data.leaveType} leave application`);
      console.log(`                 for ${data.numberOfDays} day(s) has been`);
      console.log(`                 REJECTED ❌`);
      console.log(`   Reason      : ${data.reason}`);
      console.log(`                 Please contact your manager for more info.`);
      console.log('─────────────────────────────────────');
      break;

    // ── Approval Failed (Saga compensation) ───────────
    case 'leave.approval.failed':
      logger.error('Leave approval process failed', { employeeName: data.employeeName, leaveType: data.leaveType, numberOfDays: data.numberOfDays, reason: data.reason });
      console.log('─────────────────────────────────────');
      console.log('NOTIFICATION: Approval Failed'.bgRed);
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Message     : Leave approval process failed.`);
      console.log(`                 Your leave is back to PENDING status.`);
      console.log(`   Reason      : ${data.reason}`);
      console.log(`                 Please contact HR for assistance.`);
      console.log('─────────────────────────────────────');
      break;

    default:
      console.log(` Unknown event type: ${eventType}`.red);
  }
};

// ─── Helper: Format date ───────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

module.exports = { processNotification };