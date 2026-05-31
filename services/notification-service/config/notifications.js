require('colors'); 

const { createLogger } = require('../../../shared/config/logger');
const { sendEmail } = require('./emailService');

const logger = createLogger('notification-service');


const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};


// ─── Process each notification type ───────────────────
const processNotification = async (eventType, data) => {
  switch (eventType) {

    // ── Leave Applied ──────────────────────────────────
    case 'leave.applied':
      console.log('─────────────────────────────────────');
      console.log('NOTIFICATION: Leave Application Submitted');
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Email       : ${data.employeeEmail}`);
      console.log(`   Leave Type  : ${data.leaveType}`);
      console.log(`   Days        : ${data.numberOfDays}`);
      console.log(`   Dates       : ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`);
      console.log(`   Status      : PENDING`);
      console.log('─────────────────────────────────────');

      await sendEmail({
        to: data.employeeEmail,
        subject: `Leave Application Submitted — ${data.leaveType} (${data.numberOfDays} days)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Leave Application Submitted ⏳</h2>
            <p>Dear <b>${data.employeeName}</b>,</p>
            <p>Your leave application has been submitted successfully and is pending approval.</p>
            <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Leave Type</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.leaveType}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>From</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${formatDate(data.startDate)}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>To</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${formatDate(data.endDate)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Number of Days</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.numberOfDays}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Reason</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.reason}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Status</b></td>
                <td style="padding:10px; border:1px solid #dee2e6; color: orange;"><b>PENDING ⏳</b></td>
              </tr>
            </table>
            <p>Your manager will review your request shortly.</p>
            <p style="color:#666; font-size:12px;">— Leave Management System</p>
          </div>
        `
      });
      break;

    // ── Leave Approved ────────────────────────────────
    case 'leave.approved':
      console.log('─────────────────────────────────────');
      console.log('NOTIFICATION: Leave Approved');
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Email       : ${data.employeeEmail}`);
      console.log(`   Leave Type  : ${data.leaveType}`);
      console.log(`   Days        : ${data.numberOfDays}`);
      console.log('─────────────────────────────────────');

      await sendEmail({
        to: data.employeeEmail,
        subject: `Leave Approved ✅ — ${data.leaveType} (${data.numberOfDays} days)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Leave Approved ✅</h2>
            <p>Dear <b>${data.employeeName}</b>,</p>
            <p>Great news! Your leave application has been <b style="color:green;">APPROVED</b>.</p>
            <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Leave Type</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.leaveType}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>From</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${formatDate(data.startDate)}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>To</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${formatDate(data.endDate)}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Number of Days</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.numberOfDays}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Status</b></td>
                <td style="padding:10px; border:1px solid #dee2e6; color:green;"><b>APPROVED ✅</b></td>
              </tr>
            </table>
            <p>Enjoy your time off! 🎉</p>
            <p style="color:#666; font-size:12px;">— Leave Management System</p>
          </div>
        `
      });
      break;

    // ── Leave Rejected ────────────────────────────────
    case 'leave.rejected':
      console.log('─────────────────────────────────────');
      console.log('NOTIFICATION: Leave Rejected');
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Email       : ${data.employeeEmail}`);
      console.log(`   Reason      : ${data.reason}`);
      console.log('─────────────────────────────────────');

      await sendEmail({
        to: data.employeeEmail,
        subject: `Leave Rejected ❌ — ${data.leaveType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Leave Rejected ❌</h2>
            <p>Dear <b>${data.employeeName}</b>,</p>
            <p>Unfortunately, your leave application has been <b style="color:red;">REJECTED</b>.</p>
            <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Leave Type</b></td>
                <td style="padding:10px; border:1px solid #dee2e6;">${data.leaveType}</td>
              </tr>
              <tr>
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Rejection Reason</b></td>
                <td style="padding:10px; border:1px solid #dee2e6; color:red;">${data.reason}</td>
              </tr>
              <tr style="background:#f8f9fa;">
                <td style="padding:10px; border:1px solid #dee2e6;"><b>Status</b></td>
                <td style="padding:10px; border:1px solid #dee2e6; color:red;"><b>REJECTED ❌</b></td>
              </tr>
            </table>
            <p>Please contact your manager for more information.</p>
            <p style="color:#666; font-size:12px;">— Leave Management System</p>
          </div>
        `
      });
      break;

    // ── Approval Failed ───────────────────────────────
    case 'leave.approval.failed':
      console.log('─────────────────────────────────────');
      console.log('NOTIFICATION: Approval Process Failed');
      console.log(`   To Employee : ${data.employeeName}`);
      console.log(`   Reason      : ${data.reason}`);
      console.log('─────────────────────────────────────');

      await sendEmail({
        to: data.employeeEmail,
        subject: 'Leave Approval Failed ⚠️',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12;">Leave Approval Failed ⚠️</h2>
            <p>Dear <b>${data.employeeName}</b>,</p>
            <p>The leave approval process encountered an error.</p>
            <p>Your leave has been reverted to <b>PENDING</b> status.</p>
            <p><b>Reason:</b> ${data.reason}</p>
            <p>Please contact HR for assistance.</p>
            <p style="color:#666; font-size:12px;">— Leave Management System</p>
          </div>
        `
      });
      break;

    default:
      console.log(`Unknown event type: ${eventType}`);
  }
};

module.exports = { processNotification };