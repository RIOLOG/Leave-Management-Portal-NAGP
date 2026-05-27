// {
//   userId: "auth-service-user-id",  // links to auth service
//   name: "Ankit Singh",
//   email: "ankit.singh14@nagarro.com",
//   role: "employee",
//   managerId: "manager-user-id",
//   leaveBalance: {
//     casual:    { total: 12, used: 0, remaining: 12 },
//     sick:      { total: 10, used: 0, remaining: 10 },
//     privilege: { total: 15, used: 0, remaining: 15 }
//   },
//   isActive: true
// }





const mongoose = require('mongoose');

// ─── Leave Balance Schema ──────────────────────────────
const leaveBalanceSchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true,
    default: 0
  },
  used: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    required: true
  }
}, { _id: false });  



// ─── Employee Schema ───────────────────────────────────
const employeeSchema = new mongoose.Schema(
  {
    // Links to Auth Service user
    userId: {
      type: String,
      required: [true, 'userId is required'],
      unique: true
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },

    role: {
      type: String,
      enum: ['employee', 'manager'],
      required: true
    },

    // managerId from Auth Service
    managerId: {
      type: String,
      default: null
    },

    // Leave balance per type
    leaveBalance: {
      casual: {
        type: leaveBalanceSchema,
        default: () => ({ total: 12, used: 0, remaining: 12 })
      },
      sick: {
        type: leaveBalanceSchema,
        default: () => ({ total: 10, used: 0, remaining: 10 })
      },
      privilege: {
        type: leaveBalanceSchema,
        default: () => ({ total: 15, used: 0, remaining: 15 })
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);



// ─── Method: Deduct Leave Balance ─────────────────────
employeeSchema.methods.deductLeave = function(leaveType, days) {
  const balance = this.leaveBalance[leaveType];

  if (!balance) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

  if (balance.remaining < days) {
    throw new Error(
      `Insufficient ${leaveType} leave balance. ` +
      `Available: ${balance.remaining}, Requested: ${days}`
    );
  }

  balance.used += days;
  balance.remaining -= days;
  return this;
};


// ─── Method: Restore Leave Balance ────────────────────
// Used for Saga compensation — if leave approval fails
employeeSchema.methods.restoreLeave = function(leaveType, days) {
  const balance = this.leaveBalance[leaveType];

  if (!balance) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

  balance.used -= days;
  balance.remaining += days;
  return this;
};

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;