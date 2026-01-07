import { pgTable, serial, text, date, timestamp, integer } from "drizzle-orm/pg-core";

// Blog Posts Table
export const blogPosts = pgTable("blog_posts", {
    id: serial("post_id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    canonicalTag: text("canonical_tag"),
    metaTitle: text("meta_title"),
    author: text("author"),
    metaDescription: text("meta_description"),
    stack: text("stack"),
    metaKeywords: text("meta_keywords"),
    metaTags: text("meta_tags"), // Generic meta tags
    content: text("content").notNull(),
    readTime: text("read_time"),
    blogImage: text("blogimage"), // URL to the image
    uploadDate: date("upload_date").defaultNow(),
});

// Jobs Table
export const jobs = pgTable("jobs", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    department: text("department").notNull(),
    type: text("type").notNull(),
    location: text("location").notNull(),
    postedDate: date("posted_date").notNull(),
    description: text("description").notNull(),
    // Storing arrays as text[] in Postgres
    requirements: text("requirements").array().notNull(),
    responsibilities: text("responsibilities").array().notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// Job Applications Table
export const jobApplications = pgTable("job_applications", {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").notNull(), // Assuming it links to jobs.id
    name: text("name").notNull(),
    email: text("email").notNull(),
    portfolio: text("portfolio"),
    coverLetter: text("cover_letter"),
    cvUrl: text("cv_url").notNull(), // URL from Cloudinary
    createdAt: timestamp("created_at").defaultNow(),
});
