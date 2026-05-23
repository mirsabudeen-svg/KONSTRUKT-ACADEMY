# **KONSTRUKT DB Schema & API Map (PostgreSQL \+ Supabase)**

## **1\. DATABASE SCHEMA**

### **Core User & Cohort Management**

CREATE TABLE cohorts (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  name VARCHAR(100) NOT NULL, \-- e.g., "Batch 01 \- Kannur"  
  start\_date DATE,  
  trainer\_id TEXT REFERENCES users(id)  
);

CREATE TABLE users (  
  id TEXT PRIMARY KEY, \-- Matches Clerk User ID  
  role VARCHAR(20) DEFAULT 'student', \-- 'student', 'trainer', 'admin'  
  cohort\_id UUID REFERENCES cohorts(id),  
  tokens\_remaining INT DEFAULT 10,  
  created\_at TIMESTAMPTZ DEFAULT NOW()  
);

### **The 10-Day Mission Architecture**

CREATE TABLE modules (  
  id INT PRIMARY KEY, \-- 1 through 10  
  title VARCHAR(200) NOT NULL,  
  mission\_layer VARCHAR(20), \-- 'THINK', 'DESIGN', 'BUILD', 'OPERATE'  
  badge\_name VARCHAR(100),  
  required\_hardware TEXT\[\] \-- e.g., \['Bambu A1 Mini', 'ESP32-S3'\]  
);

CREATE TABLE progress (  
  student\_id TEXT REFERENCES users(id),  
  module\_id INT REFERENCES modules(id),  
  status VARCHAR(20) DEFAULT 'locked', \-- 'locked', 'ready', 'in\_progress', 'pending\_review', 'completed'  
  score INT,  
  PRIMARY KEY (student\_id, module\_id)  
);

### **Trainer Operations & Hardware Workflow**

CREATE TABLE submissions (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  student\_id TEXT REFERENCES users(id),  
  module\_id INT REFERENCES modules(id),  
  submission\_type VARCHAR(50), \-- 'quiz', 'prompt\_text', 'stl\_file', 'video\_demo'  
  content\_url TEXT,  
  status VARCHAR(20) DEFAULT 'pending', \-- 'pending', 'approved', 'rejected'  
  trainer\_feedback TEXT,  
  submitted\_at TIMESTAMPTZ DEFAULT NOW()  
);

CREATE TABLE print\_queue (  
  id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
  student\_id TEXT REFERENCES users(id),  
  submission\_id UUID REFERENCES submissions(id),  
  status VARCHAR(30) DEFAULT 'waiting\_for\_printer', \-- 'waiting', 'printing', 'failed', 'completed'  
  printer\_assigned VARCHAR(50) DEFAULT 'Bambu\_A1\_Mini'  
);

## **2\. API ROUTE MAP (Next.js App Router)**

### **Learner Application Routes**

* GET /api/student/progress \- Fetches the student's current unlock status for Days 1-10.  
* POST /api/student/submit \- Uploads a quiz result or file (e.g., generated STL) and updates the submissions table. Changes module status to pending\_review.  
* POST /api/ai/generate \- **(CRITICAL)** Hits Anthropic API. Deducts 1 token from users.tokens\_remaining. Injects the *Brownout Rule* into the system prompt if asking for ESP32 code.

### **Trainer Operations Routes**

* GET /api/trainer/cohort-status \- Returns a matrix of all students in a cohort and their current module (1-10).  
* POST /api/trainer/review \- Trainer approves/rejects a submission. If approved, updates progress table for module\_id to completed, and unlocks module\_id \+ 1\.  
* PATCH /api/trainer/print-queue \- Updates the status of physical 3D prints (moving from waiting to completed).  
* POST /api/trainer/refill-tokens \- Adds \+5 tokens to a student's account if they run out during the prompt engineering phase.

### **Security / RLS**

* All /api/student/\* routes must verify Clerk JWT sub matches student\_id.  
* All /api/trainer/\* routes must verify Clerk JWT role is trainer or admin.