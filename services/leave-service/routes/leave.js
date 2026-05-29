const express = require('express');
const axios = require('axios');
const Leave = require('../models/Leave');
const { authenticate, isManager, isOwnerOrManager } = require('../middleware/auth');
const { runApprovalSaga } = require('../config/sagaOrchestrator');
const { publishEvent } = require('../config/rabbitmq');
const { checkBalanceCB } = require('../config/circuitBreaker');
const { createLogger } = require('../config/logger');

const logger = createLogger('leave-service');

const router = express.Router();

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';


// ─── POST /leaves ──────────────────────────────────────
// Apply for leave — employee only
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employeeId = req.user.userId;
    const employeeName = req.user.name;
    const managerId = req.user.managerId;

    // Step 1 — validate input
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'leaveType, startDate, endDate and reason are required'
      });
    }

    // Step 2 — validate employee has managerId
    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'No manager assigned — contact HR'
      });
    }


    // Step 3 — validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after or equal to start date'
      });
    }

    // Step 4 — calculate working days
    const numberOfDays = Leave.calculateDays(startDate, endDate);

    if (numberOfDays === 0) {
      return res.status(400).json({
        success: false,
        message: 'Leave dates fall on weekends only'
      });
    }


    // Step 5 — check overlapping leaves
    const hasOverlap = await Leave.hasOverlap(employeeId, startDate, endDate);
    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: 'You already have a leave request for these dates'
      });
    }


    // // Step 6 — check leave balance (call Employee Service) - Without Circuit Breaker
    // try {
    //   const balanceRes = await axios.get(
    //     `${EMPLOYEE_SERVICE_URL}/employees/${employeeId}/balance`,
    //     { headers: { authorization: req.headers['authorization'] } }
    //   );

    //   const balance = balanceRes.data.data.leaveBalance[leaveType];

    //   if (!balance) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `Invalid leave type: ${leaveType}`
    //     });
    //   }

    //   if (balance.remaining < numberOfDays) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `Insufficient ${leaveType} balance. Available: ${balance.remaining}, Requested: ${numberOfDays}`
    //     });
    //   }

    // } catch (error) {
    //   return res.status(503).json({
    //     success: false,
    //     message: 'Could not verify leave balance — try again'
    //   });
    // }




    // Step 6 — check leave balance (call Employee Service) - With Crcuit Breaker
    try {
      const balanceResult = await checkBalanceCB.fire({
        employeeId,
        leaveType,
        token: req.headers['authorization']
      });

      // Check if fallback triggered
      if (balanceResult.fallback) {
        return res.status(503).json({
          success: false,
          message: 'Cannot verify balance — Employee Service unavailable. Try again later.'
        });
      }

      const balance = balanceResult.data.leaveBalance[leaveType];

      if (!balance) {
        return res.status(400).json({
          success: false,
          message: `Invalid leave type: ${leaveType}`
        });
      }

      if (balance.remaining < numberOfDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${leaveType} balance. Available: ${balance.remaining}, Requested: ${numberOfDays}`
        });
      }

    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Could not verify leave balance — try again'
      });
    }


    // Step 7 — create leave request
    const leave = await Leave.create({
      employeeId,
      employeeName,
      managerId,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason,
      status: 'pending'
    });

    // Step 8 — notify manager async
    publishEvent('leave.applied', {
      leaveId: leave._id,
      employeeId,
      employeeName,
      managerId,
      leaveType,
      numberOfDays,
      startDate,
      endDate,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave
    });

    logger.info('New leave application', {
      leaveId: leave._id,
      employeeId,
      employeeName,
      numberOfDays,
      startDate,
      endDate
    });

  } catch (error) {
    next(error);
  }
});



// ─── GET /leaves ───────────────────────────────────────
// Employee: own leaves
// Manager: team leaves
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const role = req.user.role;
    const userId = req.user.userId;

    // Build query based on role
    let query = {};

    if (role === 'manager') {
      query.managerId = userId;  // all team leaves
    } else {
      query.employeeId = userId;  // own leaves only
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

     // Filter by date range
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate)   query.startDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Leave.countDocuments(query);

    const leaves = await Leave.find(query)
      .sort({ createdAt: -1 })  // newest first
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    res.status(200).json({
      success: true,
      data: leaves,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    next(error);
  }
});



// ─── GET /leaves/:leaveId ──────────────────────────────
//GET /leaves = list of leaves (many records)
//GET /leaves/:leaveId = ONE specific leave (full details)


// Scenario 1 — Employee checks specific leave:
// → Employee sees list of leaves
// → Wants full details of one specific leave
// → Calls GET /leaves/abc123
// → Gets complete info including rejection reason ✅

// Scenario 2 — Manager reviews specific request:
// → Manager sees list of pending requests
// → Clicks on one to see full details
// → Calls GET /leaves/abc123
// → Sees reason, dates, employee info 


router.get('/:leaveId', authenticate, async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.leaveId)
      .select('-__v');
    // console.log('Fetched leave id:', leave); 

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Employee can only see own leave
    // Manager can see team leave
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== 'manager' && leave.employeeId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: leave
    });

  } catch (error) {
    next(error);
  }
});



// ─── PUT /leaves/:leaveId/approve ─────────────────────
// Manager only
router.put('/:leaveId/approve', authenticate, isManager, async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check manager owns this leave request
    if (leave.managerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve your team members leaves'
      });
    }

    // Only pending leaves can be approved
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve — leave is already ${leave.status}`
      });
    }

    // Run Saga for approval
    const result = await runApprovalSaga(leave, req.user.userId);

    if (result.success) {

      logger.info('Leave approved', {
        leaveId: leave._id,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        managerId: leave.managerId,
        leaveType: leave.leaveType,
        numberOfDays: leave.numberOfDays
      });

      return res.status(200).json({
        success: true,
        message: 'Leave approved successfully',
        data: result.leave
      });

    } else {

      logger.warn('Leave approval failed', {
        leaveId: leave._id,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        managerId: leave.managerId,
        leaveType: leave.leaveType,
        numberOfDays: leave.numberOfDays
      });


      return res.status(400).json({
        success: false,
        message: result.error || 'Approval failed',
        data: result.leave
      });
    }

  } catch (error) {
    next(error);
  }
});



// ─── PUT /leaves/:leaveId/reject ──────────────────────
// Manager only
router.put('/:leaveId/reject', authenticate, isManager, async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.managerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject your team members leaves'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject — leave is already ${leave.status}`
      });
    }

    // Update leave status
    leave.status = 'rejected';
    leave.rejectionReason = reason;
    leave.actionBy = req.user.userId;
    leave.actionAt = new Date();
    await leave.save();

    // Notify employee async
    publishEvent('leave.rejected', {
      leaveId: leave._id,
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      managerId: leave.managerId,
      leaveType: leave.leaveType,
      numberOfDays: leave.numberOfDays,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Leave rejected',
      data: leave
    });

  } catch (error) {
    next(error);
  }
});



// ─── PUT /leaves/:leaveId/cancel ──────────────────────
// Employee only — cancel own pending leave
router.put('/:leaveId/cancel', authenticate, async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only own leave
    if (leave.employeeId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave'
      });
    }

    // Only pending leaves can be cancelled
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel — leave is already ${leave.status}`
      });
    }

    leave.status = 'cancelled';
    leave.actionAt = new Date();
    await leave.save();

    res.status(200).json({
      success: true,
      message: 'Leave cancelled successfully',
      data: leave
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;