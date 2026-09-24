-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "trialEndsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "licenseKey" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "maxStudents" INTEGER NOT NULL DEFAULT 100,
    "activatedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "subdomain" TEXT,
    "settingsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "photoUrl" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "otpHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "classTeacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "teacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER NOT NULL,
    "userId" INTEGER,
    "sessionId" INTEGER,
    "rollNo" TEXT,
    "familyNo" TEXT,
    "name" TEXT NOT NULL,
    "lastName" TEXT,
    "firstNameUrdu" TEXT,
    "lastNameUrdu" TEXT,
    "fatherName" TEXT,
    "fatherNameUrdu" TEXT,
    "fatherCnic" TEXT,
    "fatherQualification" TEXT,
    "fatherOccupation" TEXT,
    "motherName" TEXT,
    "motherCnic" TEXT,
    "motherQualification" TEXT,
    "motherOccupation" TEXT,
    "motherPhone" TEXT,
    "caste" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "photoUrl" TEXT,
    "province" TEXT,
    "city" TEXT,
    "postalAddress" TEXT,
    "email" TEXT,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bFormNo" TEXT,
    "admissionTestMarks" DOUBLE PRECISION,
    "isFreeStudent" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "emergencyPhone" TEXT,
    "bloodGroup" TEXT,
    "foodDietaryReq" TEXT,
    "allergies" TEXT,
    "childCondition" TEXT,
    "prevSchoolName" TEXT,
    "prevSchoolFocalPerson" TEXT,
    "prevSchoolPhone" TEXT,
    "prevSchoolAddress" TEXT,
    "prevAdmissionNo" TEXT,
    "prevGrade" TEXT,
    "prevTestGrade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cnic" TEXT,
    "occupation" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "empCode" TEXT,
    "name" TEXT NOT NULL,
    "cnic" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "photoUrl" TEXT,
    "departmentId" INTEGER,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3),
    "salaryType" TEXT NOT NULL DEFAULT 'monthly',
    "basicSalary" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "feeTitle" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "dueDayOfMonth" INTEGER NOT NULL DEFAULT 10,
    "lateFeePerDay" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInvoice" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER,
    "feeTitle" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "lateFee" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "dueAmount" INTEGER NOT NULL DEFAULT 0,
    "month" TEXT,
    "year" INTEGER,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "voucherNo" TEXT,
    "isCustomFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" INTEGER,
    "notifiedVia" TEXT,
    "transactionRef" TEXT,
    "receiptNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "categoryId" INTEGER,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basic" INTEGER NOT NULL DEFAULT 0,
    "allowances" INTEGER NOT NULL DEFAULT 0,
    "deductionsAbsent" INTEGER NOT NULL DEFAULT 0,
    "deductionsLate" INTEGER NOT NULL DEFAULT 0,
    "loanDeduction" INTEGER NOT NULL DEFAULT 0,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "netSalary" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "issuedBy" INTEGER,
    "issueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "markedBy" INTEGER,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'manual',
    "markedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "classId" INTEGER,
    "classIds" TEXT,
    "sessionId" INTEGER,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'test',
    "term" TEXT,
    "dateStart" TIMESTAMP(3),
    "dateEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMark" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "schoolId" INTEGER,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER,
    "obtainedMarks" INTEGER NOT NULL DEFAULT 0,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "grade" TEXT,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "theoryMarks" INTEGER,
    "practicalMarks" INTEGER,
    "graceMarks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkDiary" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "subjectId" INTEGER,
    "teacherId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "isSmsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkDiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "recipientType" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "category" TEXT,
    "purchasePrice" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" INTEGER,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRoute" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "name" TEXT NOT NULL,
    "vehicleNo" TEXT,
    "driverName" TEXT,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionInquiry" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "classInterested" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentComplaint" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "parentId" INTEGER,
    "studentId" INTEGER,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "classId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "day" TEXT NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "subjectId" INTEGER,
    "teacherId" INTEGER,
    "subject" TEXT,
    "teacherName" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLoan" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "loanAmount" INTEGER NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "monthlyInstallment" INTEGER NOT NULL DEFAULT 0,
    "paidInstallments" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "loanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Noticeboard" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'all',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Noticeboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "subjectId" INTEGER,
    "teacherId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL DEFAULT 'link',
    "fileUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineClass" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "subjectId" INTEGER,
    "teacherId" INTEGER,
    "title" TEXT NOT NULL,
    "meetingLink" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplication" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "applicantType" TEXT NOT NULL DEFAULT 'student',
    "applicantId" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" INTEGER,
    "approvalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'all',
    "channel" TEXT NOT NULL DEFAULT 'app',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTutorial" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "videoUrl" TEXT NOT NULL,
    "duration" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTutorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayEvent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'holiday',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT '#E24B4A',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorRecord" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "behavior" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "recordedBy" INTEGER,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolTask" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "holderType" TEXT NOT NULL DEFAULT 'student',
    "holderId" INTEGER NOT NULL,
    "certType" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "issuedBy" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAppraisal" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "term" TEXT NOT NULL DEFAULT 'Annual',
    "score" INTEGER NOT NULL DEFAULT 0,
    "rating" TEXT NOT NULL DEFAULT 'Good',
    "strengths" TEXT,
    "improvements" TEXT,
    "goals" TEXT,
    "reviewerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "appraisalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAppraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "appraisalId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "oldBasicSalary" INTEGER NOT NULL,
    "newBasicSalary" INTEGER NOT NULL,
    "incrementPercent" INTEGER NOT NULL DEFAULT 0,
    "incrementAmount" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "firstApprovalComment" TEXT,
    "secondApprovalComment" TEXT,
    "applyComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "requiresDualApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalStage" INTEGER NOT NULL DEFAULT 0,
    "proposedBy" INTEGER,
    "firstApprovedBy" INTEGER,
    "secondApprovedBy" INTEGER,
    "approvedBy" INTEGER,
    "appliedBy" INTEGER,
    "rolledBackBy" INTEGER,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstApprovedAt" TIMESTAMP(3),
    "secondApprovedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'thumb',
    "ipAddress" TEXT,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricPunch" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "deviceId" INTEGER,
    "personType" TEXT NOT NULL DEFAULT 'student',
    "personId" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'thumb',
    "punchTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL DEFAULT 'in',
    "matched" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BiometricPunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceEnrollment" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "personType" TEXT NOT NULL DEFAULT 'student',
    "personId" INTEGER NOT NULL,
    "photoData" TEXT NOT NULL,
    "descriptor" TEXT,
    "enrolledBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatePass" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "parentName" TEXT NOT NULL,
    "passCode" TEXT NOT NULL,
    "reason" TEXT,
    "validDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "usedAt" TIMESTAMP(3),
    "issuedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionLead" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "classApplied" TEXT,
    "source" TEXT NOT NULL DEFAULT 'walk-in',
    "stage" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "assignedTo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFollowUp" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "outcome" TEXT,
    "byUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopDocument" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DbBackup" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "recordCounts" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DbBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoboBuddyConfig" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "botName" TEXT NOT NULL DEFAULT 'RoboBuddy',
    "whatsappNumber" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoFeeReminder" BOOLEAN NOT NULL DEFAULT true,
    "autoAbsentAlert" BOOLEAN NOT NULL DEFAULT true,
    "autoResultShare" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Assalam-o-Alaikum! Main aapke school ka RoboBuddy hoon 🇵🇰',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoboBuddyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'direct',
    "title" TEXT,
    "classId" INTEGER,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "senderName" TEXT,
    "senderRole" TEXT,
    "body" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,
    "attachmentData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTimetable" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "subjectName" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamTimetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER,
    "sectionId" INTEGER,
    "subjectId" INTEGER,
    "title" TEXT NOT NULL,
    "testType" TEXT NOT NULL DEFAULT 'Weekly',
    "date" TIMESTAMP(3),
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestMark" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "obtainedMarks" INTEGER NOT NULL DEFAULT 0,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "requestedStatus" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "personType" TEXT NOT NULL,
    "sessionId" INTEGER,
    "totalAllowed" INTEGER NOT NULL DEFAULT 20,
    "consumed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSettings" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "passingMarks" INTEGER NOT NULL DEFAULT 40,
    "gradingSystem" TEXT NOT NULL DEFAULT 'percentage',
    "gradeAPlus" INTEGER NOT NULL DEFAULT 90,
    "gradeA" INTEGER NOT NULL DEFAULT 80,
    "gradeB" INTEGER NOT NULL DEFAULT 65,
    "gradeC" INTEGER NOT NULL DEFAULT 50,
    "gradeD" INTEGER NOT NULL DEFAULT 40,
    "firstDivision" INTEGER NOT NULL DEFAULT 60,
    "secondDivision" INTEGER NOT NULL DEFAULT 45,
    "thirdDivision" INTEGER NOT NULL DEFAULT 33,
    "showRankOnMarksheet" BOOLEAN NOT NULL DEFAULT true,
    "showPercentage" BOOLEAN NOT NULL DEFAULT true,
    "showGrade" BOOLEAN NOT NULL DEFAULT true,
    "showAttendance" BOOLEAN NOT NULL DEFAULT false,
    "showTeacherSignature" BOOLEAN NOT NULL DEFAULT true,
    "showPrincipalSignature" BOOLEAN NOT NULL DEFAULT true,
    "admitCardInstructions" TEXT,
    "resultCardHeader" TEXT,
    "failCriteria" TEXT NOT NULL DEFAULT 'less_than_passing',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateRegistry" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "certType" TEXT NOT NULL,
    "personType" TEXT NOT NULL,
    "personId" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "issuedBy" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CertificateRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "studentId" INTEGER,
    "invoiceId" INTEGER,
    "transactionNo" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL DEFAULT 'online',
    "provider" TEXT,
    "providerRef" TEXT,
    "channel" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'fee_payment',
    "notes" TEXT,
    "metadata" TEXT,
    "initiatedBy" INTEGER,
    "processedBy" INTEGER,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "category" TEXT,
    "shelfCode" TEXT,
    "accessionNo" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "publishedYear" INTEGER,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "issueDays" INTEGER NOT NULL DEFAULT 14,
    "finePerDay" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookIssue" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "campusId" INTEGER,
    "bookId" INTEGER NOT NULL,
    "studentId" INTEGER,
    "staffId" INTEGER,
    "issuedToType" TEXT NOT NULL DEFAULT 'student',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'issued',
    "fineAmount" INTEGER NOT NULL DEFAULT 0,
    "finePaid" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "issuedBy" INTEGER,
    "receivedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscribedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMEvent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PTMEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMSlot" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "classId" INTEGER,
    "teacherId" INTEGER,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PTMSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMBooking" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "notes" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PTMBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumniProfile" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "passoutYear" INTEGER,
    "currentOccupation" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "country" TEXT,
    "linkedIn" TEXT,
    "achievements" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumniProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolEvent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "venue" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teamName" TEXT,
    "position" INTEGER,
    "score" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "templateId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "runDays" TEXT,
    "runTime" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "School_email_key" ON "School"("email");

-- CreateIndex
CREATE UNIQUE INDEX "School_licenseKey_key" ON "School"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_schoolId_key" ON "User"("email", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_schoolId_status_deletedAt_idx" ON "Student"("schoolId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Student_schoolId_classId_sectionId_idx" ON "Student"("schoolId", "classId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "ParentStudent_schoolId_parentId_idx" ON "ParentStudent"("schoolId", "parentId");

-- CreateIndex
CREATE INDEX "ParentStudent_schoolId_studentId_idx" ON "ParentStudent"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "FeeInvoice_schoolId_studentId_idx" ON "FeeInvoice"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "FeeInvoice_schoolId_status_idx" ON "FeeInvoice"("schoolId", "status");

-- CreateIndex
CREATE INDEX "FeePayment_schoolId_paymentDate_idx" ON "FeePayment"("schoolId", "paymentDate");

-- CreateIndex
CREATE INDEX "FeePayment_schoolId_studentId_idx" ON "FeePayment"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "FeePayment_invoiceId_idx" ON "FeePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "Expense_schoolId_date_idx" ON "Expense"("schoolId", "date");

-- CreateIndex
CREATE INDEX "SalaryRecord_schoolId_month_year_idx" ON "SalaryRecord"("schoolId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryRecord_staffId_month_year_key" ON "SalaryRecord"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_date_idx" ON "Attendance"("schoolId", "date");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_studentId_idx" ON "Attendance"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");

-- CreateIndex
CREATE INDEX "Exam_schoolId_classId_idx" ON "Exam"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "ExamMark_schoolId_idx" ON "ExamMark"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMark_examId_studentId_subjectId_key" ON "ExamMark"("examId", "studentId", "subjectId");

-- CreateIndex
CREATE INDEX "HomeworkDiary_schoolId_classId_date_idx" ON "HomeworkDiary"("schoolId", "classId", "date");

-- CreateIndex
CREATE INDEX "StaffLoan_schoolId_staffId_idx" ON "StaffLoan"("schoolId", "staffId");

-- CreateIndex
CREATE INDEX "Noticeboard_schoolId_idx" ON "Noticeboard"("schoolId");

-- CreateIndex
CREATE INDEX "StudyMaterial_schoolId_classId_idx" ON "StudyMaterial"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "OnlineClass_schoolId_classId_idx" ON "OnlineClass"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "LeaveApplication_schoolId_applicantType_applicantId_idx" ON "LeaveApplication"("schoolId", "applicantType", "applicantId");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_idx" ON "Announcement"("schoolId");

-- CreateIndex
CREATE INDEX "HolidayEvent_schoolId_idx" ON "HolidayEvent"("schoolId");

-- CreateIndex
CREATE INDEX "BehaviorRecord_schoolId_studentId_idx" ON "BehaviorRecord"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "SchoolTask_schoolId_status_idx" ON "SchoolTask"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Certificate_schoolId_holderType_holderId_idx" ON "Certificate"("schoolId", "holderType", "holderId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_schoolId_serialNo_key" ON "Certificate"("schoolId", "serialNo");

-- CreateIndex
CREATE INDEX "StaffAppraisal_schoolId_staffId_idx" ON "StaffAppraisal"("schoolId", "staffId");

-- CreateIndex
CREATE INDEX "StaffAppraisal_schoolId_year_term_idx" ON "StaffAppraisal"("schoolId", "year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAdjustment_appraisalId_key" ON "PayrollAdjustment"("appraisalId");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_schoolId_status_idx" ON "PayrollAdjustment"("schoolId", "status");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_schoolId_staffId_idx" ON "PayrollAdjustment"("schoolId", "staffId");

-- CreateIndex
CREATE INDEX "RolePermission_schoolId_role_idx" ON "RolePermission"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_schoolId_role_module_key" ON "RolePermission"("schoolId", "role", "module");

-- CreateIndex
CREATE INDEX "BiometricDevice_schoolId_idx" ON "BiometricDevice"("schoolId");

-- CreateIndex
CREATE INDEX "BiometricPunch_schoolId_personType_personId_idx" ON "BiometricPunch"("schoolId", "personType", "personId");

-- CreateIndex
CREATE INDEX "BiometricPunch_schoolId_punchTime_idx" ON "BiometricPunch"("schoolId", "punchTime");

-- CreateIndex
CREATE UNIQUE INDEX "FaceEnrollment_schoolId_personType_personId_key" ON "FaceEnrollment"("schoolId", "personType", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "GatePass_passCode_key" ON "GatePass"("passCode");

-- CreateIndex
CREATE INDEX "GatePass_schoolId_studentId_idx" ON "GatePass"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "AdmissionLead_schoolId_stage_idx" ON "AdmissionLead"("schoolId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "RoboBuddyConfig_schoolId_key" ON "RoboBuddyConfig"("schoolId");

-- CreateIndex
CREATE INDEX "Conversation_schoolId_updatedAt_idx" ON "Conversation"("schoolId", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamTimetable_schoolId_examId_classId_sectionId_idx" ON "ExamTimetable"("schoolId", "examId", "classId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSettings_schoolId_key" ON "ExamSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionNo_key" ON "PaymentTransaction"("transactionNo");

-- CreateIndex
CREATE INDEX "PaymentTransaction_schoolId_status_createdAt_idx" ON "PaymentTransaction"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_schoolId_studentId_idx" ON "PaymentTransaction"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_schoolId_invoiceId_idx" ON "PaymentTransaction"("schoolId", "invoiceId");

-- CreateIndex
CREATE INDEX "LibraryBook_schoolId_title_idx" ON "LibraryBook"("schoolId", "title");

-- CreateIndex
CREATE INDEX "LibraryBook_schoolId_category_idx" ON "LibraryBook"("schoolId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryBook_schoolId_accessionNo_key" ON "LibraryBook"("schoolId", "accessionNo");

-- CreateIndex
CREATE INDEX "BookIssue_schoolId_bookId_status_idx" ON "BookIssue"("schoolId", "bookId", "status");

-- CreateIndex
CREATE INDEX "BookIssue_schoolId_studentId_status_idx" ON "BookIssue"("schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "BookIssue_schoolId_staffId_status_idx" ON "BookIssue"("schoolId", "staffId", "status");

-- CreateIndex
CREATE INDEX "DeviceToken_schoolId_userId_isActive_idx" ON "DeviceToken"("schoolId", "userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_schoolId_token_key" ON "DeviceToken"("schoolId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PTMBooking_slotId_studentId_key" ON "PTMBooking"("slotId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AlumniProfile_studentId_key" ON "AlumniProfile"("studentId");

-- CreateIndex
CREATE INDEX "AlumniProfile_schoolId_idx" ON "AlumniProfile"("schoolId");

-- CreateIndex
CREATE INDEX "AlumniProfile_passoutYear_idx" ON "AlumniProfile"("passoutYear");

-- CreateIndex
CREATE INDEX "SchoolEvent_schoolId_date_idx" ON "SchoolEvent"("schoolId", "date");

-- CreateIndex
CREATE INDEX "SchoolEvent_schoolId_type_idx" ON "SchoolEvent"("schoolId", "type");

-- CreateIndex
CREATE INDEX "SchoolEvent_schoolId_status_idx" ON "SchoolEvent"("schoolId", "status");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_idx" ON "EventParticipant"("eventId");

-- CreateIndex
CREATE INDEX "EventParticipant_studentId_idx" ON "EventParticipant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_studentId_key" ON "EventParticipant"("eventId", "studentId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_schoolId_category_idx" ON "NotificationTemplate"("schoolId", "category");

-- CreateIndex
CREATE INDEX "NotificationTemplate_schoolId_type_idx" ON "NotificationTemplate"("schoolId", "type");

-- CreateIndex
CREATE INDEX "AutomationRule_schoolId_trigger_idx" ON "AutomationRule"("schoolId", "trigger");

-- CreateIndex
CREATE INDEX "AutomationRule_schoolId_isActive_idx" ON "AutomationRule"("schoolId", "isActive");

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAppraisal" ADD CONSTRAINT "StaffAppraisal_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "StaffAppraisal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AdmissionLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestMark" ADD CONSTRAINT "TestMark_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestMark" ADD CONSTRAINT "TestMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSettings" ADD CONSTRAINT "ExamSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateRegistry" ADD CONSTRAINT "CertificateRegistry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMEvent" ADD CONSTRAINT "PTMEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMSlot" ADD CONSTRAINT "PTMSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PTMEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMBooking" ADD CONSTRAINT "PTMBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PTMSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMBooking" ADD CONSTRAINT "PTMBooking_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumniProfile" ADD CONSTRAINT "AlumniProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolEvent" ADD CONSTRAINT "SchoolEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SchoolEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

