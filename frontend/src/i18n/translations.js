/**
 * IlmForge — Multi-Language Translations
 * Languages: English (en) | اردو (ur) | Roman Urdu (roman)
 */

export const LANGUAGES = [
  { code: 'en',    label: 'English',       nativeLabel: 'English',  dir: 'ltr', flag: '🇬🇧' },
  { code: 'ur',    label: 'Urdu',          nativeLabel: 'اردو',     dir: 'rtl', flag: '🇵🇰' },
  { code: 'roman', label: 'Roman Urdu',    nativeLabel: 'Roman',    dir: 'ltr', flag: '🇵🇰' },
];

export const translations = {

  /* ─── Navigation ──────────────────────────────── */
  nav: {
    dashboard:        { en: 'Dashboard',          ur: 'ڈیش بورڈ',          roman: 'Dashboard' },
    workflow:         { en: 'Smart Workflow Hub',  ur: 'سمارٹ ورک فلو ہب',   roman: 'Smart Workflow Hub' },
    students:         { en: 'Students Hub',        ur: 'طلباء ہب',           roman: 'Talba Hub' },
    staff:            { en: 'Staff & Teachers Hub',ur: 'عملہ و اساتذہ ہب',    roman: 'Amla wa Asatza Hub' },
    parents:          { en: 'Parents & Portals',   ur: 'والدین و پورٹلز',     roman: 'Waldain wa Portals' },
    academics:        { en: 'Academics Hub',       ur: 'تعلیمی ہب',          roman: 'Talimi Hub' },
    attendance:       { en: 'Attendance Hub',      ur: 'حاضری ہب',           roman: 'Haazri Hub' },
    exams:            { en: 'Exams & Tests Hub',   ur: 'امتحانات ہب',         roman: 'Imtehanaat Hub' },
    fees:             { en: 'Fees & Accounts Hub', ur: 'فیس و اکاؤنٹس ہب',   roman: 'Fees wa Accounts Hub' },
    salary:           { en: 'Salary & Expenses',   ur: 'تنخواہ و اخراجات',    roman: 'Tankhaah wa Ikhraajaat' },
    communication:    { en: 'Communication Hub',   ur: 'مواصلاتی ہب',         roman: 'Muwasalati Hub' },
    operations:       { en: 'Operations Hub',      ur: 'آپریشنز ہب',          roman: 'Operations Hub' },
    settings:         { en: 'Settings Hub',        ur: 'ترتیبات ہب',          roman: 'Tarteebat Hub' },
    library:          { en: 'Library',             ur: 'کتب خانہ',            roman: 'Kutub Khaana' },
    transport:        { en: 'Transport',           ur: 'ٹرانسپورٹ',           roman: 'Transport' },
    gatePass:         { en: 'Gate Passes',         ur: 'گیٹ پاس',             roman: 'Gate Pass' },
    reports:          { en: 'Reports Hub (110+)',  ur: 'رپورٹس ہب',           roman: 'Reports Hub (110+)' },
    calendar:         { en: 'Academic Calendar',   ur: 'تعلیمی تقویم',         roman: 'Talimi Taqweem' },
    backup:           { en: 'Backup & Restore',    ur: 'بیک اپ و بحالی',       roman: 'Backup wa Bahaali' },
    website:          { en: 'Website Management',  ur: 'ویب سائٹ انتظام',      roman: 'Website Intezam' },
  },

  /* ─── Dashboard ───────────────────────────────── */
  dashboard: {
    title:            { en: 'Dashboard',           ur: 'ڈیش بورڈ',            roman: 'Dashboard' },
    totalStudents:    { en: 'Total Students',      ur: 'کل طلباء',             roman: 'Kul Talba' },
    totalStaff:       { en: 'Total Staff',         ur: 'کل عملہ',              roman: 'Kul Amla' },
    feeToday:         { en: 'Fee Collected Today', ur: 'آج جمع فیس',           roman: 'Aaj Jama Fees' },
    defaulters:       { en: 'Fee Defaulters',      ur: 'بقایہ دار',             roman: 'Baqaaya Daar' },
    presentToday:     { en: 'Present Today',       ur: 'آج حاضر',              roman: 'Aaj Haazir' },
    pendingLeaves:    { en: 'Pending Leaves',      ur: 'زیر التواء چھٹیاں',     roman: 'Zair Iltawa Chuttiyaan' },
    quickActions:     { en: 'Quick Actions',       ur: 'فوری اقدامات',          roman: 'Fori Iqdamaat' },
    recentActivity:   { en: 'Recent Activity',     ur: 'حالیہ سرگرمی',          roman: 'Haaliya Sargaram' },
    refresh:          { en: 'Refresh',             ur: 'تازہ کریں',             roman: 'Taaza Karain' },
    addStudent:       { en: 'Add Student',         ur: 'طالب علم شامل کریں',    roman: 'Talib Ilm Shamil Karain' },
    collectFee:       { en: 'Collect Fee',         ur: 'فیس جمع کریں',         roman: 'Fees Jama Karain' },
    markAttendance:   { en: 'Mark Attendance',     ur: 'حاضری لگائیں',          roman: 'Haazri Lagaain' },
    examResults:      { en: 'Exam Results',        ur: 'امتحانی نتائج',          roman: 'Imtehani Nataij' },
    sendSMS:          { en: 'Send SMS',            ur: 'SMS بھیجیں',            roman: 'SMS Bhejayn' },
  },

  /* ─── Students ─────────────────────────────────── */
  students: {
    title:            { en: 'Students',            ur: 'طلباء',                 roman: 'Talba' },
    allStudents:      { en: 'All Students',        ur: 'تمام طلباء',            roman: 'Tamam Talba' },
    admitStudent:     { en: 'Admit Student',       ur: 'طالب علم داخل کریں',    roman: 'Talib Ilm Daakhil Karain' },
    studentName:      { en: 'Student Name',        ur: 'طالب علم کا نام',       roman: 'Talib Ilm Ka Naam' },
    fatherName:       { en: "Father's Name",       ur: 'والد کا نام',            roman: 'Walid Ka Naam' },
    rollNo:           { en: 'Roll Number',         ur: 'رول نمبر',              roman: 'Roll Number' },
    class:            { en: 'Class',               ur: 'جماعت',                 roman: 'Jamaat' },
    section:          { en: 'Section',             ur: 'سیکشن',                 roman: 'Section' },
    gender:           { en: 'Gender',              ur: 'جنس',                   roman: 'Jins' },
    dob:              { en: 'Date of Birth',       ur: 'تاریخ پیدائش',          roman: 'Taareekh-e-Pedaaish' },
    address:          { en: 'Address',             ur: 'پتہ',                   roman: 'Pata' },
    phone:            { en: 'Phone Number',        ur: 'فون نمبر',              roman: 'Phone Number' },
    active:           { en: 'Active',              ur: 'فعال',                  roman: 'Faal' },
    inactive:         { en: 'Inactive',            ur: 'غیر فعال',              roman: 'Ghair Faal' },
    search:           { en: 'Search students…',    ur: 'طلباء تلاش کریں…',      roman: 'Talba Talaash Karain…' },
    bulkImport:       { en: 'Bulk Import',         ur: 'یکمشت درآمد',           roman: 'Ek Musht Daraamad' },
    promote:          { en: 'Promote Students',    ur: 'طلباء کو ترقی دیں',     roman: 'Talba Ko Taraqqi Dain' },
    alumni:           { en: 'Alumni',              ur: 'فارغ التحصیل',           roman: 'Farig-ul-Tahseel' },
  },

  /* ─── Attendance ───────────────────────────────── */
  attendance: {
    title:            { en: 'Attendance',          ur: 'حاضری',                 roman: 'Haazri' },
    markAttendance:   { en: 'Mark Attendance',     ur: 'حاضری لگائیں',          roman: 'Haazri Lagaain' },
    present:          { en: 'Present',             ur: 'حاضر',                  roman: 'Haazir' },
    absent:           { en: 'Absent',              ur: 'غائب',                  roman: 'Ghaib' },
    late:             { en: 'Late',                ur: 'دیر سے',                roman: 'Der Se' },
    leave:            { en: 'Leave',               ur: 'چھٹی',                  roman: 'Chutti' },
    saveAttendance:   { en: 'Save Attendance',     ur: 'حاضری محفوظ کریں',      roman: 'Haazri Mehfooz Karain' },
    report:           { en: 'Attendance Report',   ur: 'حاضری رپورٹ',           roman: 'Haazri Report' },
    barcode:          { en: 'Barcode Scan',        ur: 'بارکوڈ سکین',            roman: 'Barcode Scan' },
    allPresent:       { en: 'All Present',         ur: 'سب حاضر',               roman: 'Sab Haazir' },
    allAbsent:        { en: 'All Absent',          ur: 'سب غائب',               roman: 'Sab Ghaib' },
  },

  /* ─── Fees ─────────────────────────────────────── */
  fees: {
    title:            { en: 'Fees',                ur: 'فیس',                   roman: 'Fees' },
    collectFee:       { en: 'Collect Fee',         ur: 'فیس جمع کریں',         roman: 'Fees Jama Karain' },
    generateFee:      { en: 'Generate Fee',        ur: 'فیس بنائیں',            roman: 'Fees Banaain' },
    defaulters:       { en: 'Defaulters',          ur: 'بقایہ دار',             roman: 'Baqaaya Daar' },
    feeStructure:     { en: 'Fee Structure',       ur: 'فیس ڈھانچہ',            roman: 'Fees Dhaancha' },
    totalBilled:      { en: 'Total Billed',        ur: 'کل بل',                 roman: 'Kul Bill' },
    totalPaid:        { en: 'Total Paid',          ur: 'کل ادا',                roman: 'Kul Ada' },
    totalDue:         { en: 'Total Due',           ur: 'کل باقی',               roman: 'Kul Baqi' },
    amount:           { en: 'Amount',              ur: 'رقم',                   roman: 'Raqam' },
    dueDate:          { en: 'Due Date',            ur: 'آخری تاریخ',             roman: 'Aakhri Taareekh' },
    paid:             { en: 'Paid',                ur: 'ادا شدہ',               roman: 'Ada Shuda' },
    unpaid:           { en: 'Unpaid',              ur: 'غیر ادا',               roman: 'Ghair Ada' },
    receipt:          { en: 'Receipt',             ur: 'رسید',                  roman: 'Raseed' },
    voucher:          { en: 'Fee Voucher',         ur: 'فیس وصولی',             roman: 'Fees Vocher' },
    month:            { en: 'Month',               ur: 'مہینہ',                 roman: 'Maheena' },
    searchStudent:    { en: 'Search student…',     ur: 'طالب علم تلاش کریں…',   roman: 'Talib Ilm Talaash Karain…' },
  },

  /* ─── Exams ─────────────────────────────────────── */
  exams: {
    title:            { en: 'Exams & Tests',       ur: 'امتحانات',              roman: 'Imtehanaat' },
    createExam:       { en: 'Create Exam',         ur: 'امتحان بنائیں',          roman: 'Imtehaan Banaain' },
    enterMarks:       { en: 'Enter Marks',         ur: 'نمبر درج کریں',         roman: 'Number Darj Karain' },
    viewResults:      { en: 'View Results',        ur: 'نتائج دیکھیں',           roman: 'Nataij Dekhayn' },
    meritList:        { en: 'Merit List',          ur: 'میرٹ لسٹ',              roman: 'Merit List' },
    examTitle:        { en: 'Exam Title',          ur: 'امتحان کا عنوان',        roman: 'Imtehaan Ka Unwan' },
    totalMarks:       { en: 'Total Marks',         ur: 'کل نمبر',               roman: 'Kul Number' },
    obtained:         { en: 'Obtained',            ur: 'حاصل شدہ',              roman: 'Haasil Shuda' },
    pass:             { en: 'Pass',                ur: 'کامیاب',                roman: 'Kaamyaab' },
    fail:             { en: 'Fail',                ur: 'ناکام',                 roman: 'Naakaam' },
    absent:           { en: 'Absent',              ur: 'غائب',                  roman: 'Ghaib' },
    printMarksheet:   { en: 'Print Marksheet',     ur: 'نتیجہ پرنٹ کریں',       roman: 'Nateeja Print Karain' },
  },

  /* ─── Staff ─────────────────────────────────────── */
  staff: {
    title:            { en: 'Staff',               ur: 'عملہ',                  roman: 'Amla' },
    addStaff:         { en: 'Add Staff',           ur: 'عملہ شامل کریں',         roman: 'Amla Shamil Karain' },
    staffName:        { en: 'Staff Name',          ur: 'ملازم کا نام',           roman: 'Mulazim Ka Naam' },
    designation:      { en: 'Designation',         ur: 'عہدہ',                  roman: 'Uhda' },
    department:       { en: 'Department',          ur: 'شعبہ',                  roman: 'Shuba' },
    salary:           { en: 'Salary',              ur: 'تنخواہ',                roman: 'Tankhaah' },
    generateSalary:   { en: 'Generate Salary',     ur: 'تنخواہ بنائیں',          roman: 'Tankhaah Banaain' },
    leaves:           { en: 'Leave Applications',  ur: 'چھٹی درخواستیں',         roman: 'Chutti Darkhwaastain' },
  },

  /* ─── Common ─────────────────────────────────────── */
  common: {
    save:             { en: 'Save',                ur: 'محفوظ کریں',            roman: 'Mehfooz Karain' },
    cancel:           { en: 'Cancel',              ur: 'منسوخ کریں',            roman: 'Mansookh Karain' },
    delete:           { en: 'Delete',              ur: 'حذف کریں',              roman: 'Hazf Karain' },
    edit:             { en: 'Edit',                ur: 'ترمیم کریں',            roman: 'Tarmeem Karain' },
    add:              { en: 'Add',                 ur: 'شامل کریں',             roman: 'Shamil Karain' },
    print:            { en: 'Print',               ur: 'پرنٹ کریں',             roman: 'Print Karain' },
    export:           { en: 'Export',              ur: 'برآمد کریں',             roman: 'Baraamad Karain' },
    search:           { en: 'Search',              ur: 'تلاش کریں',             roman: 'Talaash Karain' },
    filter:           { en: 'Filter',              ur: 'فلٹر',                  roman: 'Filter' },
    loading:          { en: 'Loading…',            ur: 'لوڈ ہو رہا ہے…',         roman: 'Load ho raha hai…' },
    noData:           { en: 'No data found',       ur: 'کوئی ڈیٹا نہیں ملا',    roman: 'Koi data nahi mila' },
    yes:              { en: 'Yes',                 ur: 'ہاں',                   roman: 'Haan' },
    no:               { en: 'No',                  ur: 'نہیں',                  roman: 'Nahi' },
    submit:           { en: 'Submit',              ur: 'جمع کروائیں',            roman: 'Jama Karwaain' },
    back:             { en: 'Back',                ur: 'پیچھے',                 roman: 'Peechay' },
    next:             { en: 'Next',                ur: 'اگلا',                  roman: 'Agla' },
    close:            { en: 'Close',               ur: 'بند کریں',              roman: 'Band Karain' },
    confirm:          { en: 'Confirm',             ur: 'تصدیق کریں',            roman: 'Tasdeeq Karain' },
    view:             { en: 'View',                ur: 'دیکھیں',                roman: 'Dekhayn' },
    download:         { en: 'Download',            ur: 'ڈاؤن لوڈ',              roman: 'Download' },
    send:             { en: 'Send',                ur: 'بھیجیں',                roman: 'Bhejayn' },
    update:           { en: 'Update',              ur: 'اپ ڈیٹ کریں',           roman: 'Update Karain' },
    create:           { en: 'Create',              ur: 'بنائیں',                roman: 'Banaain' },
    generate:         { en: 'Generate',            ur: 'تیار کریں',             roman: 'Tayyar Karain' },
    active:           { en: 'Active',              ur: 'فعال',                  roman: 'Faal' },
    inactive:         { en: 'Inactive',            ur: 'غیر فعال',              roman: 'Ghair Faal' },
    total:            { en: 'Total',               ur: 'کل',                    roman: 'Kul' },
    status:           { en: 'Status',              ur: 'حیثیت',                 roman: 'Haisiyat' },
    date:             { en: 'Date',                ur: 'تاریخ',                 roman: 'Taareekh' },
    name:             { en: 'Name',                ur: 'نام',                   roman: 'Naam' },
    email:            { en: 'Email',               ur: 'ای میل',                roman: 'Email' },
    phone:            { en: 'Phone',               ur: 'فون',                   roman: 'Phone' },
    address:          { en: 'Address',             ur: 'پتہ',                   roman: 'Pata' },
    selectAll:        { en: 'Select All',          ur: 'سب منتخب کریں',          roman: 'Sab Muntakhab Karain' },
    actions:          { en: 'Actions',             ur: 'اقدامات',               roman: 'Iqdamaat' },
    logout:           { en: 'Logout',              ur: 'لاگ آؤٹ',               roman: 'Log Out' },
    settings:         { en: 'Settings',            ur: 'ترتیبات',               roman: 'Tarteebat' },
    profile:          { en: 'Profile',             ur: 'پروفائل',               roman: 'Profile' },
    notifications:    { en: 'Notifications',       ur: 'اطلاعات',               roman: 'Itlaaat' },
    welcome:          { en: 'Welcome',             ur: 'خوش آمدید',              roman: 'Khush Aamdeed' },
    school:           { en: 'School',              ur: 'مدرسہ',                 roman: 'Madrasa' },
    campus:           { en: 'Campus',              ur: 'کیمپس',                 roman: 'Campus' },
    session:          { en: 'Session',             ur: 'سال',                   roman: 'Saal' },
    class:            { en: 'Class',               ur: 'جماعت',                 roman: 'Jamaat' },
    subject:          { en: 'Subject',             ur: 'مضمون',                 roman: 'Mazmoon' },
    teacher:          { en: 'Teacher',             ur: 'استاد',                 roman: 'Ustaad' },
    parent:           { en: 'Parent',              ur: 'والدین',                roman: 'Waldain' },
    student:          { en: 'Student',             ur: 'طالب علم',              roman: 'Talib Ilm' },
    male:             { en: 'Male',                ur: 'مذکر',                  roman: 'Muzakkar' },
    female:           { en: 'Female',              ur: 'مؤنث',                  roman: 'Muannas' },
    superAdmin:       { en: 'Super Admin',         ur: 'سپر ایڈمن',             roman: 'Super Admin' },
    admin:            { en: 'Admin',               ur: 'ایڈمن',                 roman: 'Admin' },
  },

  /* ─── Portals ───────────────────────────────────── */
  portals: {
    parentPortal:     { en: 'Parent Portal',       ur: 'والدین پورٹل',           roman: 'Waldain Portal' },
    teacherPortal:    { en: 'Teacher Portal',      ur: 'استاد پورٹل',            roman: 'Ustaad Portal' },
    studentPortal:    { en: 'Student Portal',      ur: 'طالب علم پورٹل',         roman: 'Talib Ilm Portal' },
    overview:         { en: 'Overview',            ur: 'جائزہ',                 roman: 'Jaaiza' },
    myFees:           { en: 'My Fees',             ur: 'میری فیس',              roman: 'Meri Fees' },
    results:          { en: 'Results',             ur: 'نتائج',                 roman: 'Nataij' },
    homework:         { en: 'Homework',            ur: 'گھر کا کام',             roman: 'Ghar Ka Kaam' },
    myAttendance:     { en: 'Attendance',          ur: 'حاضری',                 roman: 'Haazri' },
    materials:        { en: 'Materials',           ur: 'مواد',                  roman: 'Mawad' },
    notices:          { en: 'Notices',             ur: 'اطلاعات',               roman: 'Itlaaat' },
    complaints:       { en: 'Complaints',          ur: 'شکایات',                roman: 'Shikayaat' },
    leaveApply:       { en: 'Leave Apply',         ur: 'چھٹی درخواست',           roman: 'Chutti Darkhwaast' },
    timetable:        { en: 'Timetable',           ur: 'وقت کا جدول',            roman: 'Waqt Ka Jadwal' },
    documents:        { en: 'Documents',           ur: 'دستاویزات',              roman: 'Dastaweezaat' },
  },

  /* ─── Settings ───────────────────────────────────── */
  settings: {
    title:            { en: 'Settings',            ur: 'ترتیبات',               roman: 'Tarteebat' },
    schoolProfile:    { en: 'School Profile',      ur: 'مدرسے کی معلومات',       roman: 'Madrasa Ki Maloomat' },
    campuses:         { en: 'Campuses',            ur: 'کیمپسز',                roman: 'Campuses' },
    classes:          { en: 'Classes',             ur: 'جماعتیں',               roman: 'Jamaatein' },
    subjects:         { en: 'Subjects',            ur: 'مضامین',                roman: 'Mazaameen' },
    admins:           { en: 'Admins & Roles',      ur: 'منتظمین',               roman: 'Muntazimeen' },
    smsTemplates:     { en: 'SMS Templates',       ur: 'SMS ٹیمپلیٹس',          roman: 'SMS Templates' },
    theme:            { en: 'Theme',               ur: 'تھیم',                  roman: 'Theme' },
    backup:           { en: 'Backup & Restore',    ur: 'بیک اپ',                roman: 'Backup' },
    language:         { en: 'Language',            ur: 'زبان',                  roman: 'Zubaan' },
    changeLanguage:   { en: 'Change Language',     ur: 'زبان تبدیل کریں',        roman: 'Zubaan Tabdeel Karain' },
  },
};

/**
 * Get translation for a key
 * @param {string} section - e.g. 'nav', 'dashboard', 'common'
 * @param {string} key - e.g. 'students', 'save'
 * @param {string} lang - 'en' | 'ur' | 'roman'
 * @returns {string}
 */
export const t = (section, key, lang = 'en') => {
  const sect = translations[section];
  if (!sect) return key;
  const entry = sect[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
};

export default translations;
