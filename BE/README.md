# EDUTEST BACKEND API - HỆ THỐNG ĐỀ THI & GIÁM SÁT TRỰC TUYẾN REAL-TIME

Hệ thống Backend API xây dựng bằng **Node.js**, **Express**, **Sequelize ORM**, **MySQL** và **Socket.IO** dành cho Giáo viên (Quản lý, tạo đề, giao đề, giám sát làm bài trực tiếp) và Học sinh (Làm bài, nộp bài, chấm điểm tự động, tích xu/điểm thưởng).

---

## 📁 CẤU TRÚC THƯ MỤC CHUẨN MODULAR (LAYERED ARCHITECTURE)

```text
BE/
├── database/
│   └── edutest_database.sql       # File SQL tạo bảng & Dữ liệu mẫu (Import vào phpMyAdmin)
├── src/
│   ├── config/
│   │   ├── database.js            # Cấu hình kết nối MySQL qua Sequelize
│   │   ├── jwt.js                 # Cấu hình Secret & hạn dùng Token
│   │   └── socket.js              # Khởi tạo Socket.IO & hàm phát thông báo Real-time
│   ├── constants/
│   │   ├── httpStatus.js          # Mã trạng thái HTTP (200, 201, 400, 401, 403, 404, 500)
│   │   ├── roles.js               # Định nghĩa quyền: teacher, student
│   │   └── examStatus.js          # Trạng thái thi: not_started, in_progress, completed
│   ├── controllers/
│   │   ├── auth.controller.js     # Điều hướng Đăng nhập Giáo viên & Học sinh
│   │   ├── classroom.controller.js# Cây thư mục lớp học & danh sách học sinh
│   │   ├── exam.controller.js     # Quản lý kho đề, tạo đề thi, giao đề theo lớp
│   │   ├── student.controller.js  # Học sinh tải đề, làm bài, lịch sử
│   │   ├── attempt.controller.js  # Nộp bài, chấm điểm, tích điểm thưởng
│   │   ├── monitor.controller.js  # Giám sát trạng thái thi thời gian thực
│   │   └── wallet.controller.js   # Xem ví điểm thưởng và xu
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Xác thực JWT Bearer Token
│   │   ├── role.middleware.js     # Phân quyền (teacher / student)
│   │   ├── validator.middleware.js# Kiểm tra tính hợp lệ dữ liệu request
│   │   └── errorHandler.middleware.js # Xử lý lỗi 404 và Global Exception Handler
│   ├── models/
│   │   ├── Teacher.js             # Bảng giáo viên
│   │   ├── Grade.js               # Bảng khối lớp (Khối 10, Khối 11, Khối 12)
│   │   ├── ClassRoom.js           # Bảng lớp học (10A1, 10A2, ...)
│   │   ├── Student.js             # Bảng học sinh (kèm ví điểm & xu)
│   │   ├── Exam.js                # Bảng đề thi / đề luyện tập
│   │   ├── Question.js            # Bảng câu hỏi trắc nghiệm
│   │   ├── QuestionOption.js      # Bảng các phương án trả lời (A, B, C, D)
│   │   ├── ExamClassAssignment.js # Bảng giao đề & trạng thái Mở/Tắt theo lớp
│   │   ├── ExamAttempt.js         # Bảng lượt làm bài của từng học sinh
│   │   ├── AttemptDetail.js       # Bảng chi tiết câu trả lời học sinh đã chọn
│   │   ├── WalletTransaction.js   # Bảng lịch sử biến động điểm thưởng / xu
│   │   └── index.js               # Thiết lập quan hệ (Associations) giữa các Model
│   ├── routes/
│   │   ├── auth.routes.js         # Routes xác thực
│   │   ├── classroom.routes.js    # Routes quản lý cây lớp học
│   │   ├── exam.routes.js         # Routes đề thi & giao đề
│   │   ├── student.routes.js      # Routes học sinh làm bài
│   │   ├── monitor.routes.js      # Routes giám sát Real-time
│   │   └── index.js               # Gom các module route vào prefix /api/v1
│   ├── services/
│   │   ├── auth.service.js        # Logic xác thực mã số + họ tên
│   │   ├── classroom.service.js   # Logic cấu trúc cây phân loại lớp
│   │   ├── exam.service.js        # Logic tạo đề thi, câu hỏi, giao đề
│   │   ├── student.service.js     # Logic lấy đề theo lớp (chống lộ đáp án)
│   │   ├── attempt.service.js     # Logic chấm điểm tự động & cộng xu/điểm
│   │   ├── monitor.service.js     # Logic thống kê tiến độ thi của lớp
│   │   └── wallet.service.js      # Logic ví xu và lịch sử
│   ├── utils/
│   │   ├── apiResponse.js         # Chuẩn hóa định dạng JSON Response
│   │   └── logger.js              # Ghi log kèm mốc thời gian
│   ├── app.js                     # Cấu hình Express app (CORS, Helmet, Body Parser)
│   └── server.js                  # Khởi chạy HTTP Server & Socket.IO
├── .env                           # File biến môi trường
├── .env.example                   # File mẫu biến môi trường
└── package.json                   # Danh sách thư viện và scripts
```

---

## 🛠 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### 1. Cài đặt Database qua phpMyAdmin
1. Khởi động **XAMPP / WampServer / MySQL Server**.
2. Mở trình duyệt vào **phpMyAdmin** (`http://localhost/phpmyadmin`).
3. Chọn tab **Import** (Nhập).
4. Nhấn **Choose File** và chọn file:
   ```text
   BE/database/edutest_database.sql
   ```
5. Nhấn **Import** (hoặc **Go**) ở cuối trang.
> File SQL đã tự động tạo cơ sở dữ liệu `edutest_db` cùng đầy đủ các bảng và dữ liệu mẫu ảo (Giáo viên, Khối 10-11-12, Lớp học, Học sinh, Đề thi, Câu hỏi, Đáp án, Lượt làm bài mẫu, Ví điểm/xu).

### 2. Cấu hình file `.env`
Mở file `BE/.env` và tùy chỉnh nếu thông tin MySQL khác mặc định:
```env
PORT=5000
NODE_ENV=development

# Thông số MySQL của bạn
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=edutest_db
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=edutest_jwt_secret_key_2026_secure
JWT_EXPIRES_IN=7d

# Frontend URL kết nối
CLIENT_URL=http://localhost:3000

# Thưởng xu và điểm khi làm đúng câu hỏi
COINS_PER_CORRECT_ANSWER=10
POINTS_PER_CORRECT_ANSWER=5
BONUS_FULL_SCORE_COINS=50
```

### 3. Cài đặt Packages và Khởi động Server
Tại thư mục `BE`:
```bash
# Cài đặt thư viện (nếu chưa cài)
npm install

# Chạy server ở chế độ phát triển (Auto reload với nodemon)
npm run dev

# Hoặc chạy production
npm start
```
Server sẽ chạy tại: **`http://localhost:5000`**

---

## 👥 TÀI KHOẢN MẪU CÓ SẴN TRONG DATABASE

### 👨‍🏫 Giáo viên (Teacher)
Đăng nhập bằng **Mã số giáo viên** và **Họ tên**:
- **Tài khoản 1:**
  - Mã số: `GV001`
  - Họ tên: `Thầy Nguyễn Văn Tuấn`
- **Tài khoản 2:**
  - Mã số: `GV002`
  - Họ tên: `Cô Lê Thị Mai`

### 👨‍🎓 Học sinh (Student)
Đăng nhập bằng **Mã số học sinh** và **Họ tên**:
- **Lớp 10A1:**
  - `HS001` - `Nguyễn Văn An` (Đã nộp bài Đề 1, được 8.0đ, có 80 xu)
  - `HS002` - `Lê Thị Bích` (Đang làm bài Đề 1)
  - `HS003` - `Trần Hoàng Cường` (Chưa mở đề)
  - `HS004` - `Phạm Ngọc Dung`
  - `HS005` - `Đỗ Quang Em`
- **Lớp 10A2:**
  - `HS006` - `Vũ Thị Giang`
  - `HS007` - `Hoàng Minh Hải`

---

## 📡 DANH SÁCH API ENDPOINTS CHI TIẾT

Mọi Request/Response đều tuân thủ chuẩn JSON đồng nhất:
```json
{
  "success": true,
  "message": "Thông báo",
  "data": { ... },
  "errors": null,
  "timestamp": "2026-10-06T11:00:00.000Z"
}
```

### 1. XÁC THỰC (AUTHENTICATION)
| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/auth/teacher/login` | Public | Đăng nhập Giáo viên (`teacher_code`, `full_name`) |
| `POST` | `/api/v1/auth/student/login` | Public | Đăng nhập Học sinh (`student_code`, `full_name`) & tự động đồng bộ lớp |
| `GET` | `/api/v1/auth/me` | Logged In | Lấy thông tin user hiện tại từ Token |

#### Ví dụ Body đăng nhập Giáo viên:
```json
POST /api/v1/auth/teacher/login
{
  "teacher_code": "GV001",
  "full_name": "Thầy Nguyễn Văn Tuấn"
}
```

#### Ví dụ Body đăng nhập Học sinh:
```json
POST /api/v1/auth/student/login
{
  "student_code": "HS001",
  "full_name": "Nguyễn Văn An"
}
```

---

### 2. DÀNH CHO GIÁO VIÊN (SERVER / ADMIN)

#### A. Quản lý danh sách lớp học (Cây phân loại lớp)
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/classrooms/tree` | `Bearer <token>` | Trả về cấu trúc cây phân loại: Khối (Grade) -> Lớp (ClassRoom) -> Danh sách học sinh (Student) |
| `GET` | `/api/v1/classrooms` | `Bearer <token>` | Danh sách phẳng các lớp học để chọn trong Dropdown |
| `GET` | `/api/v1/classrooms/:id` | `Bearer <token>` | Chi tiết 1 lớp học và danh sách học sinh của lớp |

#### B. Tạo đề thi trực tuyến & Quản lý kho đề
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/exams` | `Bearer <token>` | Tạo đề thi mới kèm câu hỏi, các phương án A,B,C,D và đánh dấu đáp án đúng |
| `GET` | `/api/v1/exams` | `Bearer <token>` | Lấy danh sách kho đề thi (có tìm kiếm `?search=...`, phân trang `?page=1&limit=10`) |
| `GET` | `/api/v1/exams/:id` | `Bearer <token>` | Xem chi tiết đề thi kèm câu hỏi và lời giải thích |
| `DELETE` | `/api/v1/exams/:id` | `Bearer <token>` | Xóa đề thi |

##### Ví dụ Body tạo đề thi trực tuyến:
```json
POST /api/v1/exams
{
  "code": "DE_TOAN_10_02",
  "title": "Kiểm tra 15 phút: Phương trình bậc hai",
  "description": "Bài kiểm tra nhanh nghiệm của phương trình ax² + bx + c = 0",
  "duration_minutes": 15,
  "passing_score": 5.0,
  "questions": [
    {
      "content": "Phương trình x² - 5x + 6 = 0 có tập nghiệm là:",
      "points": 5.0,
      "order_index": 1,
      "explanation": "Phân tích thành (x - 2)(x - 3) = 0 => x = 2 hoặc x = 3",
      "options": [
        { "option_key": "A", "content": "S = {2; 3}", "is_correct": true },
        { "option_key": "B", "content": "S = {-2; -3}", "is_correct": false },
        { "option_key": "C", "content": "S = {1; 6}", "is_correct": false },
        { "option_key": "D", "content": "S = {-1; -6}", "is_correct": false }
      ]
    },
    {
      "content": "Biệt thức Delta (Δ) của phương trình bậc hai ax² + bx + c = 0 được tính bằng công thức:",
      "points": 5.0,
      "order_index": 2,
      "explanation": "Δ = b² - 4ac",
      "options": [
        { "option_key": "A", "content": "Δ = b² + 4ac", "is_correct": false },
        { "option_key": "B", "content": "Δ = b² - 4ac", "is_correct": true },
        { "option_key": "C", "content": "Δ = 2b - 4ac", "is_correct": false },
        { "option_key": "D", "content": "Δ = b² - 2ac", "is_correct": false }
      ]
    }
  ]
}
```

#### C. Mở / Tắt giao đề theo lớp
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/exams/:id/assign` | `Bearer <token>` | Giao đề cho danh sách lớp cụ thể `class_ids: [1, 2]` hoặc tất cả các lớp `assign_all: true` |
| `PATCH` | `/api/v1/exams/:id/toggle-class` | `Bearer <token>` | Bật (`is_open: true`) hoặc Tắt (`is_open: false`) phát đề cho 1 lớp cụ thể |
| `GET` | `/api/v1/exams/:id/assignments` | `Bearer <token>` | Xem danh sách các lớp đã giao và trạng thái mở/tắt |

##### Ví dụ Body Bật/Tắt phát đề:
```json
PATCH /api/v1/exams/1/toggle-class
{
  "class_id": 1,
  "is_open": true
}
```

#### D. Giám sát thời gian thực (Real-time Monitoring)
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/monitor/exams/:examId/classes/:classId` | `Bearer <token>` | Lấy bảng trạng thái thi trực tiếp của toàn bộ học sinh trong lớp (Chưa mở đề / Đang làm / Đã xong kèm thời điểm nộp và điểm số) |

---

### 3. DÀNH CHO HỌC SINH (CLIENT / WEB-API)

| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/student/exams` | `Bearer <token>` | Tải danh sách đề thi mà giáo viên đang MỞ cho lớp học sinh đó |
| `GET` | `/api/v1/student/exams/:id/start` | `Bearer <token>` | Bắt đầu làm bài: Tải câu hỏi & phương án (ĐÃ BẢO MẬT: Không trả về đáp án đúng) |
| `POST` | `/api/v1/student/exams/:id/submit` | `Bearer <token>` | Nộp bài: Máy chủ tự động chấm điểm, tính thưởng xu & điểm thưởng |
| `GET` | `/api/v1/student/attempts/:id` | `Bearer <token>` | Xem lại bài thi và chi tiết đúng/sai |
| `GET` | `/api/v1/student/history` | `Bearer <token>` | Xem lịch sử các bài thi đã làm |
| `GET` | `/api/v1/student/wallet` | `Bearer <token>` | Xem số dư ví điểm thưởng, ví xu và lịch sử biến động |
| `GET` | `/api/v1/student/profile` | `Bearer <token>` | Thông tin học sinh, lớp, khối |

##### Ví dụ Body Học sinh Nộp bài:
```json
POST /api/v1/student/exams/1/submit
{
  "answers": [
    { "question_id": 1, "selected_option_id": 1 },
    { "question_id": 2, "selected_option_id": 7 },
    { "question_id": 3, "selected_option_id": 10 },
    { "question_id": 4, "selected_option_id": 16 },
    { "question_id": 5, "selected_option_id": 17 }
  ]
}
```

##### Ví dụ Response trả về sau khi nộp bài:
```json
{
  "success": true,
  "message": "Nộp bài thi thành công! Kết quả và ví điểm thưởng đã được cập nhật.",
  "data": {
    "attempt_id": 4,
    "exam_id": 1,
    "exam_title": "Kiểm tra 15 phút: Hàm số bậc hai và đồ thị",
    "status": "completed",
    "submitted_at": "2026-10-06T11:15:30.000Z",
    "total_score": 10,
    "correct_answers_count": 5,
    "total_questions": 5,
    "is_passed": true,
    "earned_coins": 100,
    "earned_points": 25,
    "questions_result": [ ... ]
  }
}
```

---

## ⚡ SỰ KIỆN SOCKET.IO REAL-TIME

Socket server chạy cùng cổng HTTP tại `ws://localhost:5000`.

### 1. Tham gia phòng giám sát (Phía Client/Giáo viên kết nối Socket):
```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

// Giáo viên tham gia theo dõi lớp 1 đề 1
socket.emit("join_monitor_room", {
  examId: 1,
  classId: 1,
  role: "teacher",
  name: "Thầy Tuấn"
});
```

### 2. Sự kiện Server phát tự động:
- **`student_status_update`**: Phát ngay khi:
  - Học sinh mở đề bắt đầu làm bài (`status: 'in_progress'`)
  - Học sinh bấm nộp bài (`status: 'completed'`, kèm điểm số, thời gian nộp bài, số câu đúng)
```javascript
socket.on("student_status_update", (data) => {
  console.log("Cập nhật trạng thái học sinh:", data);
  // data: { student_id, full_name, status, total_score, submitted_at, ... }
});
```

- **`exam_assignment_toggled`**: Phát khi giáo viên Bật / Tắt trạng thái mở đề cho lớp:
```javascript
socket.on("exam_assignment_toggled", (data) => {
  console.log("Trạng thái mở đề lớp thay đổi:", data);
  // data: { examId, classId, isOpen }
});
```
