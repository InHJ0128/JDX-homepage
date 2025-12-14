// routes/adminRouter.js
const express = require('express');
const router = express.Router();
const {
  listUsers,
  createUser,
  toggleAdmin,
  deleteUser,
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
const upload  = require('../middleware/upload');


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
  createActivity
);
router.patch(
  '/activities/:id',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
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
  createWork
);
router.patch(
  '/work/:id',
  verifyAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateWork
);

// 에디터(ReactQuill) 인라인 이미지 업로드
router.post(
  '/upload',
  verifyAdmin,
  upload.single('image'),          // 필드명은 'image'로 고정
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


module.exports = router;