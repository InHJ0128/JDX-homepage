const express = require("express");
const cors = require("cors");
const session = require("express-session");

const path = require("path");


// Create Express app
const app = express();
app.set("trust proxy", 1);

// CORS configuration
const corsOptions = {
  origin: ["http://localhost:5173", "https://jdx.kr"],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"],
  credentials: true
};

// Apply CORS middleware (handles preflight)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Body parsing
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "my-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
      domain: 'jdx.kr',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    },
}));


// Load route modules
const authRoutes = require("./middleware/auth");
const userRoutes = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const upload = require("./middleware/upload");
const boardsRoutes = require("./routes/boards");
const commentsRoutes = require("./routes/comments");
const tagsRoutes = require("./routes/tags");

// Mount API routes
app.use("/api", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRouter);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use("/api/boards", boardsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/tags", tagsRoutes);

// Session retrieval endpoint for debugging
app.get("/api/session", (req, res) => {
  // 클라이언트가 현재 세션을 확인할 수 있도록 세션 정보를 반환
  res.json({ session: req.session });
});





// Debug: list registered routes
setImmediate(() => {
  const routes = app._router.stack
    .filter(layer => layer.route)
    .map(layer => layer.route.path);
  console.log("[DEBUG] Registered routes:", routes);
});

// Serve frontend static files and SPA fallback
const frontendPath = path.join(__dirname, "..", "..", "web", "homepage");
app.use(express.static(frontendPath));
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

module.exports = { app, upload };

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[DEBUG] Server running on http://0.0.0.0:${PORT}`);
});