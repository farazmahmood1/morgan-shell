import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

// Blog Posts Table
export const blogPosts = pgTable("blog_posts", {
    id: serial("post_id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    canonicalTag: text("canonical_tag"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    content: text("content").notNull(),
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
