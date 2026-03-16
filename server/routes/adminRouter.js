// routes/adminRouter.js
const express = require('express');
const router = express.Router();
const {
  listUsers,
  createUser,
  toggleAdmin,
  deleteUser,
  updateUserStatus,
  updateUserDetail,
  resetPassword
} = require('../controllers/adminUserController');
const {
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  hideActivity,
  getActivity,
  deleteActivityFile,
} = require('../controllers/adminActivityController');
const {
  listWork,
  createWork,
  updateWork,
  deleteWork,
  hideWork,
  getWork,
  deleteWorkFile,
} = require('../controllers/adminWorkController');
const {
  listHighlights,
  addHighlight,
  deleteHighlight,
  orderHighlight,
} = require('../controllers/adminHomeController');
const {
  listFooterNav,
  addFooterNav,
  deleteFooterNav,
  updateFooterNav,
  updateFooterOrder,
  toggleFooterHidden
} = require('../controllers/adminFooterController');
const { upload, optimizeImage } = require('../middleware/upload');
const {
  listApplications,
  unreadCount,
  markRead,
  updateStatus,
  deleteApplication,
} = require("../controllers/adminApplicationController");

// 관리자 인증 미들웨어
function verifyAdmin(req, res, next) {
  if (req.session?.user?.is_admin === 1) return next();
  res.status(403).json({ message: '관리자만 접근 가능합니다.' });
}

// DB 연결 테스트
router.get('/db-test', verifyAdmin, listActivities);

// 사용자 관리
router.get('/users', verifyAdmin, listUsers);
router.post('/users', verifyAdmin, createUser);
router.patch('/users/:id/admin', verifyAdmin, toggleAdmin);
router.delete('/users/:id', verifyAdmin, deleteUser);
router.patch('/users/:id/status', verifyAdmin, updateUserStatus);
router.patch('/users/:id', verifyAdmin, updateUserDetail);
router.patch('/users/:id/reset-password', verifyAdmin, resetPassword);

// 활동 관리
router.get('/activities', verifyAdmin, listActivities);
router.get('/activities/:id', verifyAdmin, getActivity);
router.delete('/activities/:id', verifyAdmin, deleteActivity);
router.patch('/activities/:id/hide', verifyAdmin, hideActivity);
router.delete('/activities/:id/file', verifyAdmin, deleteActivityFile);
router.post(
  '/activities',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  optimizeImage,
  createActivity
);
router.patch(
  '/activities/:id',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  optimizeImage,
  updateActivity
);

// 작품 관리
router.get('/work', verifyAdmin, listWork);
router.get('/work/:id', verifyAdmin, getWork);
router.delete('/work/:id', verifyAdmin, deleteWork);
router.patch('/work/:id/hide', verifyAdmin, hideWork);
router.delete('/work/:id/file', verifyAdmin, deleteWorkFile);
router.post(
  '/work',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  optimizeImage,
  createWork
);
router.patch(
  '/work/:id',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  optimizeImage,
  updateWork
);

// 에디터(ReactQuill) 인라인 이미지 업로드
router.post(
  '/upload',
  verifyAdmin,
  upload.single('image'),
  optimizeImage,                   
  (req, res) => {
    const url = req.file ? `/uploads/${req.file.filename}` : null;
    res.json({ url });
  }
);

//홈 화면 사진 설정
router.get("/home-highlights", verifyAdmin, listHighlights);
router.post("/home-highlights", verifyAdmin, addHighlight);
router.delete("/home-highlights/:id", verifyAdmin, deleteHighlight);
router.patch('/home-highlights/order', verifyAdmin, orderHighlight);

//하단 네비게이션 설정
router.get("/footer-nav", verifyAdmin, listFooterNav);
router.post("/footer-nav", verifyAdmin, addFooterNav);
router.patch("/footer-nav/order", verifyAdmin, updateFooterOrder);
router.patch("/footer-nav/:id", verifyAdmin, updateFooterNav);
router.patch("/footer-nav/:id/hidden", verifyAdmin, toggleFooterHidden);
router.delete("/footer-nav/:id", verifyAdmin, deleteFooterNav);

//신규부원 지원서 관리
router.get("/applications", verifyAdmin, listApplications);
router.get("/applications/unread-count", verifyAdmin, unreadCount);
router.patch("/applications/:id/read", verifyAdmin, markRead);
router.patch("/applications/:id/status", verifyAdmin, updateStatus);
router.delete("/applications/:id", verifyAdmin, deleteApplication);

module.exports = router;