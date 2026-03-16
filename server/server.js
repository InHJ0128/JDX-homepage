require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");

const path = require("path");


// Create Express app
const app = express();
app.set("trust proxy", true);

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
const isProd = process.env.NODE_ENV === "production";
app.use(session({
  secret: process.env.SESSION_SECRET || "my-secret-key",
  resave: false,
  saveUninitialized: false,
  proxy: true, // ★ 중요 (프록시 뒤 secure cookie 안정화)
  cookie: {
    path: "/",
    httpOnly: true,
    secure: isProd,                    // prod만 secure
    sameSite: isProd ? "none" : "lax",  // dev에서 none 쓰면 쿠키 막힘
    domain: isProd ? "jdx.kr" : undefined, // 일단 이렇게
  },
}));


app.get("/api/debug-proto", (req, res) => {
  res.json({
    protocol: req.protocol,
    secure: req.secure,
    x_forwarded_proto: req.headers["x-forwarded-proto"],
    host: req.headers.host,
  });
});

const { File } = require("node:buffer");

if (!globalThis.File) {
  globalThis.File = File;
}

// Load route modules
const authRoutes = require("./middleware/auth");
const userRoutes = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const upload = require("./middleware/upload");
const boardsRoutes = require("./routes/boards");
const commentsRoutes = require("./routes/comments");
const tagsRoutes = require("./routes/tags");
const applicationsRouter = require("./routes/applicationsRouter");
const aiRouter = require("./routes/aiRouter");
const adminAiRouter = require("./routes/adminAiRouter");


// Mount API routes
app.use("/api", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRouter);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use("/api/boards", boardsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/applications", applicationsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/admin/ai", adminAiRouter);

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