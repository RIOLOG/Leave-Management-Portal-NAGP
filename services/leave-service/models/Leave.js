const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    // Employee who applied
    employeeId: {
      type: String,
      required: [true, 'employeeId is required']
    },

    employeeName: {
      type: String,
      required: [true, 'employeeName is required']
    },

    // Manager who will approve/reject
    managerId: {
      type: String,
      required: [true, 'managerId is required']
    },

    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'privilege'],
      required: [true, 'leaveType is required']
    },

    startDate: {
      type: Date,
      required: [true, 'startDate is required']
    },

    endDate: {
      type: Date,
      required: [true, 'endDate is required']
    },

    numberOfDays: {
      type: Number,
      required: [true, 'numberOfDays is required'],
      min: [0.5, 'Minimum 0.5 days required']
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },

    // Filled when manager rejects
    rejectionReason: {
      type: String,
      default: null,
      trim: true
    },

    // Filled when manager approves/rejects
    actionBy: {
      type: String,  // managerId
      default: null
    },

    actionAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true  // createdAt = appliedAt
  }
);



// ─── Index for faster queries ──────────────────────────
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ managerId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });



// ─── Virtual: appliedAt ────────────────────────────────
// createdAt is appliedAt — just an alias
leaveSchema.virtual('appliedAt').get(function () {
  return this.createdAt;
});


// ─── Static: Calculate working days ───────────────────
leaveSchema.statics.calculateDays = function (startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let days = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
};

// ─── Static: Check overlapping leaves ─────────────────
leaveSchema.statics.hasOverlap = async function (
  employeeId,
  startDate,
  endDate,
  excludeLeaveId = null
) {
  const query = {
    employeeId,
    status: { $in: ['pending', 'approved'] },  // only check active leaves
    $or: [
      // new leave starts during existing leave
      { startDate: { $lte: new Date(endDate) },
        endDate:   { $gte: new Date(startDate) } }
    ]
  };

  // exclude current leave when updating
  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }

  const overlap = await this.findOne(query);
  return !!overlap;
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;