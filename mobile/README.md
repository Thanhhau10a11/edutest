# 📱 EduTest Mobile App (Phân hệ Học Sinh)

Ứng dụng di động chuyên biệt dành cho **Học sinh (Student)** trong Hệ sinh thái Khảo thí Trực tuyến EduTest, được xây dựng bằng **React Native (Expo)**, đồng bộ 100% tính năng với giao diện Web:

---

## ✨ Tính Năng Cốt Lõi Đồng Bộ Với Bản Web

1. **Xác thực Học sinh (Authentication & RBAC):**
   - Đăng nhập tài khoản Học sinh (`HS001` / `123456`) bằng JWT Token lưu trữ an toàn trong AsyncStorage.
   - Hỗ trợ đổi địa chỉ IP Backend trực tiếp từ màn hình đăng nhập.
2. **Kho Đề Thi (Available Exams):**
   - Xem toàn bộ danh sách đề thi mà Giáo viên đã phát cho lớp.
   - Thẻ đề thi: Mã đề, môn học, thời lượng, số câu, điểm đạt, trạng thái nộp bài.
3. **Bảo Mật Ca Thi 2 Lớp (PIN 6 Số & Khóa 1 Thiết Bị Anti-Proxy):**
   - Nhập **Mã PIN Ca Thi (6 chữ số)** do giáo viên phát.
   - Tự động sinh `deviceId` duy nhất cho thiết bị di động, ngăn chặn tài khoản đăng nhập trên thiết bị thứ 2 để làm hộ bài.
4. **Phòng Thi Trực Tuyến Thời Gian Thực (Live Exam Room):**
   - Đồng hồ đếm ngược (Countdown Timer) tự động nộp bài khi hết giờ.
   - Tự động xáo trộn câu hỏi và đảo ngẫu nhiên đáp án A-B-C-D theo từng thí sinh.
   - Hiển thị công thức Toán học & LaTeX sạch đẹp, hình ảnh đính kèm câu hỏi.
   - Thanh điều hướng / Bản đồ câu hỏi (Question Matrix) nhảy nhanh tới câu cần làm.
   - **Chống gian lận (Anti-Cheat):** Theo dõi sự kiện thoát app / chuyển tab (`AppState`), tự động tăng số lần vi phạm và bắn log cảnh báo về màn hình giám thị của Giáo viên qua Socket.IO.
   - **Kênh phát thanh trực tiếp (Socket.IO Broadcast):** Nhận thông báo và cảnh báo tức thì từ Giáo viên (`exam_broadcast`) hiển thị Popup khẩn cấp ngay trên màn hình.
   - Nộp bài thi, xem bảng điểm kết quả, thưởng xu EduCoins & điểm kinh nghiệm EduPoints, xem lại bài làm và lời giải chi tiết.
5. **Ngân Hàng Câu Sai & Phục Hồi Kiến Thức Thông Minh (Knowledge Recovery):**
   - Thống kê số câu sai trong quá khứ, số câu đã phục hồi, số câu cần ôn luyện.
   - Bắt đầu phiên làm bài luyện tập phục hồi kiến thức trực tiếp trên điện thoại.
6. **Lịch Sử Thi & Xem Lại Bài Làm (Exam History):**
   - Xem lại điểm số, ngày giờ nộp và lời giải chi tiết của từng bài thi đã làm.
7. **Ví Thưởng EduCoins & Tài Khoản Cá Nhân (Wallet & Profile):**
   - Xem số dư Xu thưởng và Điểm kinh nghiệm, lịch sử giao dịch thưởng sau mỗi lần thi.
8. **Trợ Lý AI Ôn Thi (AI Chatbot Widget):**
   - Nút nổi chatbot hỏi đáp bài tập và công thức khó với AI (Groq LPU / Gemini).

---

## 🚀 Hướng Dẫn Cài Đặt Và Chạy Ứng Dụng

### 1. Cài đặt dependencies
Mở Terminal tại thư mục `mobile`:
```bash
cd mobile
npm install
```

### 2. Khởi động ứng dụng
```bash
npm start
# hoặc
npx expo start
```

### 3. Kết nối chạy thử
- **Trên điện thoại thật (Android / iOS):**
  1. Cài ứng dụng **Expo Go** từ Google Play Store hoặc Apple App Store.
  2. Đảm bảo điện thoại và máy tính chạy Backend kết nối **cùng một mạng Wi-Fi**.
  3. Mở camera (iOS) hoặc Expo Go (Android) quét mã QR hiển thị trên màn hình terminal.
  4. Tại màn hình Đăng nhập trong app, bấm **Cấu hình địa chỉ IP máy chủ Backend** và điền IP máy tính của bạn (Ví dụ: `http://192.168.1.50:5000/api/v1`).
- **Trên máy ảo Android Studio (Emulator):**
  - Mặc định app cấu hình IP `http://10.0.2.2:5000/api/v1` trỏ thẳng về localhost máy tính.
- **Trên máy ảo iOS Simulator (Mac):**
  - Mặc định app dùng `http://localhost:5000/api/v1`.

