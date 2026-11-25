const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../config/exam_security_state.json');

const defaultState = {
  // key: `${examId}_${classId}` -> { examId, classId, pinCode: '246810', isPinRequired: true, updatedAt }
  pins: {},
  // key: `${studentId}_${examId}` -> { studentId, studentCode, studentName, examId, classId, deviceId, deviceName, ip, lockedAt, lastActiveAt, status: 'locked' | 'completed' }
  deviceLocks: {},
  // key: `${studentId}` -> { recoveredQuestionIds: [1, 2], recoveryHistory: [...] }
  studentRecovery: {}
};

let state = { ...defaultState };

function loadState() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      state = {
        pins: parsed.pins || {},
        deviceLocks: parsed.deviceLocks || {},
        studentRecovery: parsed.studentRecovery || {}
      };
    }
  } catch (err) {
    console.warn('[ExamSecurityStore] Could not load state file, using in-memory defaults:', err.message);
  }
}

function saveState() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ExamSecurityStore] Could not persist state file:', err.message);
  }
}

loadState();

function generateDeterministicPin(examId, classId) {
  const num = ((Number(examId || 1) * 13579 + Number(classId || 1) * 24680 + 102938) % 900000) + 100000;
  return String(num).padStart(6, '0');
}

function getExamPinConfig(examId, classId) {
  const key = `${examId}_${classId}`;
  if (!state.pins[key]) {
    state.pins[key] = {
      examId: Number(examId),
      classId: Number(classId),
      pinCode: generateDeterministicPin(examId, classId),
      isPinRequired: true,
      updatedAt: new Date().toISOString()
    };
    saveState();
  }
  return state.pins[key];
}

function setExamPinConfig({ examId, classId, pinCode, isPinRequired }) {
  const current = getExamPinConfig(examId, classId);
  const key = `${examId}_${classId}`;
  state.pins[key] = {
    ...current,
    pinCode: pinCode !== undefined && String(pinCode).trim() !== '' ? String(pinCode).trim() : current.pinCode,
    isPinRequired: isPinRequired !== undefined ? Boolean(isPinRequired) : current.isPinRequired,
    updatedAt: new Date().toISOString()
  };
  saveState();
  return state.pins[key];
}

function regenerateExamPin(examId, classId) {
  const randomPin = String(Math.floor(100000 + Math.random() * 900000));
  return setExamPinConfig({
    examId,
    classId,
    pinCode: randomPin,
    isPinRequired: true
  });
}

function verifyOrAcquireDeviceLock({
  studentId,
  studentCode,
  studentName,
  examId,
  classId,
  deviceId,
  deviceName
}) {
  const key = `${studentId}_${examId}`;
  const cleanDeviceId = String(deviceId || 'default_browser_device').trim();
  const cleanDeviceName = String(deviceName || 'Trình duyệt Web').trim();
  const existing = state.deviceLocks[key];

  // Nếu đang có khóa active bởi 1 thiết bị khác
  if (existing && existing.status === 'locked' && existing.deviceId !== cleanDeviceId) {
    return {
      allowed: false,
      lockedBy: existing
    };
  }

  // Cấp khóa hoặc làm mới khóa cho thiết bị hiện tại
  state.deviceLocks[key] = {
    studentId: Number(studentId),
    studentCode: studentCode || `HS${studentId}`,
    studentName: studentName || 'Học sinh',
    examId: Number(examId),
    classId: Number(classId),
    deviceId: cleanDeviceId,
    deviceName: cleanDeviceName,
    lockedAt: existing?.lockedAt || new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    status: 'locked'
  };
  saveState();

  return {
    allowed: true,
    lock: state.deviceLocks[key]
  };
}

function releaseDeviceLock({ studentId, examId }) {
  const key = `${studentId}_${examId}`;
  if (state.deviceLocks[key]) {
    state.deviceLocks[key].status = 'completed';
    state.deviceLocks[key].lastActiveAt = new Date().toISOString();
    saveState();
  }
}

function forceUnlockStudentDevice({ studentId, examId }) {
  if (studentId && examId) {
    const key = `${studentId}_${examId}`;
    delete state.deviceLocks[key];
  } else if (examId && !studentId) {
    Object.keys(state.deviceLocks).forEach((k) => {
      if (state.deviceLocks[k]?.examId === Number(examId)) {
        delete state.deviceLocks[k];
      }
    });
  }
  saveState();
  return true;
}

function getClassDeviceLocks({ examId, classId }) {
  return Object.values(state.deviceLocks).filter(
    (item) =>
      Number(item.examId) === Number(examId) &&
      (!classId || Number(item.classId) === Number(classId))
  );
}

// Quản lý trạng thái phục hồi kiến thức của học sinh
function getStudentRecoveryState(studentId) {
  const key = String(studentId);
  if (!state.studentRecovery[key]) {
    state.studentRecovery[key] = {
      recoveredQuestionIds: [],
      mistakeCounts: {},
      lastPracticedAt: null,
      sessionsCount: 0
    };
  }
  return state.studentRecovery[key];
}

function recordStudentMistakes(studentId, wrongQuestionIds = []) {
  const rec = getStudentRecoveryState(studentId);
  wrongQuestionIds.forEach((qId) => {
    const idNum = Number(qId);
    rec.mistakeCounts[idNum] = (rec.mistakeCounts[idNum] || 0) + 1;
    // Nếu mới làm sai lại câu đã từng phục hồi thì đưa trở lại danh sách cần ôn
    rec.recoveredQuestionIds = rec.recoveredQuestionIds.filter((id) => Number(id) !== idNum);
  });
  saveState();
}

function markQuestionsRecovered(studentId, correctQuestionIds = []) {
  const rec = getStudentRecoveryState(studentId);
  const set = new Set(rec.recoveredQuestionIds.map(Number));
  correctQuestionIds.forEach((id) => set.add(Number(id)));
  rec.recoveredQuestionIds = Array.from(set);
  rec.lastPracticedAt = new Date().toISOString();
  rec.sessionsCount = (rec.sessionsCount || 0) + 1;
  saveState();
  return rec;
}

module.exports = {
  getExamPinConfig,
  setExamPinConfig,
  regenerateExamPin,
  verifyOrAcquireDeviceLock,
  releaseDeviceLock,
  forceUnlockStudentDevice,
  getClassDeviceLocks,
  getStudentRecoveryState,
  recordStudentMistakes,
  markQuestionsRecovered
};

