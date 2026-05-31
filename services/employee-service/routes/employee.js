const express = require('express');
const Employee = require('../models/Employee');

const {
  authenticate,
  isManager,
  isOwnerOrManager
} = require('../../../shared/middleware/auth');
const { createLogger } = require('../../../shared/config/logger');

const logger = createLogger('employee-service');


const router = express.Router();


// ─── GET /employees ────────────────────────────────────
// Manager only — get all employees
router.get('/', authenticate, isManager, async (req, res, next) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select('-__v');  // exclude __v field

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });

  } catch (error) {
    next(error);
  }
});


// ─── GET /employees/:userId ────────────────────────────
// Get one employee profile
router.get('/:userId', authenticate, isOwnerOrManager, async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      userId: req.params.userId,
      isActive: true
    }).select('-__v');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    next(error);
  }
});


// ─── GET /employees/:userId/balance ───────────────────
// Get leave balance
router.get('/:userId/balance', authenticate, isOwnerOrManager, async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      userId: req.params.userId,
      isActive: true
    }).select('name email leaveBalance');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employeeName: employee.name,
        email: employee.email,
        leaveBalance: employee.leaveBalance
      }
    });

  } catch (error) {
    next(error);
  }
});


// ─── PUT /employees/:userId/balance/deduct ─────────────
// Deduct leave balance — called by Leave Service
// No auth middleware — internal service call

router.put('/:userId/balance/deduct', async (req, res, next) => {
  try {
    const { leaveType, days } = req.body;

    // Validate input
    if (!leaveType || !days) {

      logger.warn('Invalid input for leave deduction', { leaveType, days });

      return res.status(400).json({
        success: false,
        message: 'leaveType and days are required'
      });
    }

    if (!['casual', 'sick', 'privilege'].includes(leaveType)) {
      logger.warn('Invalid leave type for leave deduction', { leaveType });
      return res.status(400).json({
        success: false,
        message: 'Invalid leaveType. Must be casual, sick or privilege'
      });
    }

    const employee = await Employee.findOne({
      userId: req.params.userId,
      isActive: true
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Use model method to deduct
    employee.deductLeave(leaveType, days);
    await employee.save();

    console.log(` Deducted ${days} ${leaveType} days from ${employee.name}`);
    logger.info('Deducted leave balance', {
      employeeId: employee.userId,
      employeeName: employee.name,
      leaveType,
      daysDeducted: days,
      updatedBalance: employee.leaveBalance[leaveType]
    });


    res.status(200).json({
      success: true,
      message: `Deducted ${days} ${leaveType} days successfully`,
      data: {
        employeeId: employee.userId,
        leaveType,
        daysDeducted: days,
        updatedBalance: employee.leaveBalance[leaveType]
      }
    });

  } catch (error) {
    // Handle insufficient balance error
    if (error.message.includes('Insufficient')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});


// ─── PUT /employees/:userId/balance/restore ────────────
// Restore leave balance — Saga compensation
// No auth middleware — internal service call
router.put('/:userId/balance/restore', async (req, res, next) => {
  try {
    const { leaveType, days } = req.body;

    if (!leaveType || !days) {
      return res.status(400).json({
        success: false,
        message: 'leaveType and days are required'
      });
    }

    const employee = await Employee.findOne({
      userId: req.params.userId,
      isActive: true
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Use model method to restore
    employee.restoreLeave(leaveType, days);
    await employee.save();

    console.log(` Restored ${days} ${leaveType} days to ${employee.name}`);
    logger.info('Restored leave balance', {
      employeeId: employee.userId,
      employeeName: employee.name,
      leaveType,
      daysRestored: days,
      updatedBalance: employee.leaveBalance[leaveType]
    });


    res.status(200).json({
      success: true,
      message: `Restored ${days} ${leaveType} days successfully`,
      data: {
        employeeId: employee.userId,
        leaveType,
        daysRestored: days,
        updatedBalance: employee.leaveBalance[leaveType]
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;