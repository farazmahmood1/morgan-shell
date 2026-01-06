
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { db } from "./db/index.js";
import { blogPosts, jobs, jobApplications } from "./db/schema.js";
import { eq, desc } from "drizzle-orm";
import os from "os";

const app = express();
const port = 3000;
const apipath = process.env.API_PATH || "/api/v1";

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  process.env.LIVE_URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Config (Use os.tmpdir() for cross-platform/Vercel support)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: Images, PDF, DOC, DOCX"), false);
  }
};

const uploadMulter = multer({ storage: storage, fileFilter: fileFilter });

// --- ROUTES ---

app.get("/", (req, res) => {
  res.json({
    apiVersion: "v2",
    message: "morgan Backend - Migrated to Neon/Drizzle",
    endpoints: [
      `${apipath}/login`,
      `${apipath}/jobs`,
      `${apipath}/blog-posts`
    ]
  });
});

// LOGIN (Static)
app.post(`${apipath}/login`, (req, res) => {
  const { email, password } = req.body;

  // Static Credentials
  const ADMIN_EMAIL = "adminCEOforrof32112321@forrof.io";
  const ADMIN_PASS = "Pakistan$123.";

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    res.status(200).json({
      message: "Login successful",
      success: true,
      user: {
        email: email,
        role: "admin",
      },
    });
  } else {
    res.status(401).json({
      message: "Invalid email or password",
      success: false,
    });
  }
});

// --- BLOG POSTS ---

// Create Blog Post
app.post(`${apipath}/insertblogpost`, uploadMulter.single("blogimage"), async (req, res) => {
  try {
    const { title, slug, canonical_tag, meta_title, meta_description, meta_keywords, content } = req.body;

    let imageUrl = "";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "blog_images",
      });
      imageUrl = result.secure_url;
    }

    const newPost = await db.insert(blogPosts).values({
      title,
      slug,
      canonicalTag: canonical_tag,
      metaTitle: meta_title,
      metaDescription: meta_description,
      metaKeywords: meta_keywords,
      content,
      blogImage: imageUrl,
      uploadDate: new Date().toISOString().split('T')[0],
    }).returning();

    res.json({ message: "Blog post inserted successfully", post: newPost[0] });
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Fetch All Blog Posts
app.get(`${apipath}/fetch-blog-posts`, async (req, res) => {
  try {
    const results = await db.select().from(blogPosts).orderBy(desc(blogPosts.id));
    res.json(results);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Fetch Single Blog Post by ID
app.get(`${apipath}/fetch-blog-post/:id`, async (req, res) => {
  try {
    const results = await db.select().from(blogPosts).where(eq(blogPosts.id, parseInt(req.params.id)));
    if (results.length > 0) res.json(results[0]);
    else res.status(404).json({ message: "Blog post not found" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Fetch Single Blog Post by Slug
app.get(`${apipath}/fetch-blog-post-by-slug/:slug`, async (req, res) => {
  try {
    const results = await db.select().from(blogPosts).where(eq(blogPosts.slug, req.params.slug));
    if (results.length > 0) res.json(results[0]);
    else res.status(404).json({ message: "Blog post not found" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Update Blog Post
app.put(`${apipath}/update-blog-post/:id`, uploadMulter.single("blogimage"), async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { title, slug, canonical_tag, meta_title, meta_description, meta_keywords, content } = req.body;

    let updateData = {
      title,
      slug,
      canonicalTag: canonical_tag,
      metaTitle: meta_title,
      metaDescription: meta_description,
      metaKeywords: meta_keywords,
      content,
    };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "blog_images",
      });
      updateData.blogImage = result.secure_url;
    }

    const results = await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, postId)).returning();

    if (results.length > 0) res.json({ message: "Blog post updated successfully", post: results[0] });
    else res.status(404).json({ message: "Blog post not found" });

  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Delete Blog Post
app.delete(`${apipath}/delete-blog-post/:id`, async (req, res) => {
  try {
    const results = await db.delete(blogPosts).where(eq(blogPosts.id, parseInt(req.params.id))).returning();
    if (results.length > 0) res.json({ message: "Blog post deleted successfully" });
    else res.status(404).json({ message: "Blog post not found" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});


// --- JOBS ---

// Get all jobs
app.get(`${apipath}/jobs`, async (req, res) => {
  try {
    const results = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    res.json(results);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get single job
app.get(`${apipath}/jobs/:id`, async (req, res) => {
  try {
    const results = await db.select().from(jobs).where(eq(jobs.id, parseInt(req.params.id)));
    if (results.length > 0) res.json(results[0]);
    else res.status(404).json({ message: "Job not found" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create job
app.post(`${apipath}/jobs`, async (req, res) => {
  try {
    // Handle array fields if they come as strings
    let { requirements, responsibilities, ...rest } = req.body;

    if (typeof requirements === 'string') requirements = JSON.parse(requirements);
    if (typeof responsibilities === 'string') responsibilities = JSON.parse(responsibilities);

    const newJob = await db.insert(jobs).values({
      ...rest,
      requirements: requirements || [],
      responsibilities: responsibilities || [],
      postedDate: new Date().toISOString().split('T')[0],
    }).returning();
    res.json({ message: "Job created successfully", job: newJob[0] });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Update job
app.put(`${apipath}/jobs/:id`, async (req, res) => {
  try {
    // Handle array fields
    let { requirements, responsibilities, ...rest } = req.body;

    if (typeof requirements === 'string') requirements = JSON.parse(requirements);
    if (typeof responsibilities === 'string') responsibilities = JSON.parse(responsibilities);

    const updateData = {
      ...rest,
      requirements,
      responsibilities
    };

    // Remove undefined keys
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const results = await db.update(jobs).set(updateData).where(eq(jobs.id, parseInt(req.params.id))).returning();
    if (results.length > 0) res.json({ message: "Job updated successfully", job: results[0] });
    else res.status(404).json({ message: "Job not found" });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete job
app.delete(`${apipath}/jobs/:id`, async (req, res) => {
  try {
    const results = await db.delete(jobs).where(eq(jobs.id, parseInt(req.params.id))).returning();
    if (results.length > 0) res.json({ message: "Job deleted successfully" });
    else res.status(404).json({ message: "Job not found" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- JOB APPLICATIONS ---

// Apply for a job
app.post(`${apipath}/job-applications`, uploadMulter.single("cv"), async (req, res) => {
  try {
    const { jobId, name, email, portfolio, coverLetter } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "CV file is required" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "job_applications",
      resource_type: "auto"
    });

    const newApplication = await db.insert(jobApplications).values({
      jobId: parseInt(jobId),
      name,
      email,
      portfolio,
      coverLetter,
      cvUrl: result.secure_url,
    }).returning();

    res.json({ message: "Application submitted successfully", application: newApplication[0] });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// Get all applications
app.get(`${apipath}/job-applications`, async (req, res) => {
  try {
    const results = await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
    res.json(results);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get single application
app.get(`${apipath}/job-applications/:id`, async (req, res) => {
  try {
    const results = await db.select().from(jobApplications).where(eq(jobApplications.id, parseInt(req.params.id)));
    if (results.length > 0) res.json(results[0]);
    else res.status(404).json({ message: "Application not found" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// --- EXTRAS ---
const extras = [
  { path: `${apipath}/coffee`, method: "GET", description: "Returns 418 - I'm a teapot" },
  { path: `${apipath}/why-am-i-here`, method: "GET", description: "Existential crisis endpoint" },
  { path: `${apipath}/magic-8-ball`, method: "POST", description: "Ask the API a yes/no question" },
  { path: `${apipath}/dad-joke`, method: "GET", description: "Returns a programming dad joke" },
  { path: `${apipath}/rubber-duck`, method: "POST", description: "Rubber duck debugging service" }
];

extras.forEach(route => {
  if (route.method === "GET") app.get(route.path, (req, res) => res.json({ message: route.description }));
  if (route.method === "POST") app.post(route.path, (req, res) => res.json({ message: route.description }));
});

// Local dev server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

export default app;
