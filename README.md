# 📚 Online Gradebook

Hey there! Welcome to my online gradebook project. This is a simple but sleek web app I built to help teachers manage student grades and students track their progress. Think of it as a mini school portal, but way more chill.

## 🎯 What's This About?

You know how managing grades can be a pain? This app tries to make it easier. Teachers can view students, manage classes, and track grades. Students can log in to see their grades and absences. Nothing too fancy, just what you need.

## ✨ What Can You Do?

### For Teachers
- 👀 View all registered students
- 📝 Add grades and absences for students
- ✏️ Edit and delete grades (for subjects you teach)
- 👔 Classmaster view with detailed student profiles
- 📊 View class statistics and student performance
- ✅ Motivate unmotivated absences (classmaster only)

### For Students
- 📈 See your grades across all subjects
- 📅 Track absences (motivated and unmotivated)
- 📊 View summary stats and overall average
- 💬 Receive personalized academic feedback
- 📚 View grades organized by subject with averages

### For Parents
- 👨‍👩‍👧‍👦 View all your children's academic progress
- 📊 See grades and absences for each child
- 📈 Track performance across all subjects

## 🚀 Getting Started

First, clone this repo:

```bash
git clone https://github.com/zyreoo/gradebook.git
cd online-gradebook
```

Install the dependencies:

```bash
npm install
```

### Setting Up Firebase

You'll need a Firebase project for this. Here's what to do:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Get your service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `firebase-service-account.json` in the root folder
4. Update `config/firebase.js` with your Firebase config

### Run It

```bash
npm start
```

Then open your browser and go to `http://localhost:3000`

### Seeding the Database

To populate the database with sample data (one school, 10 teachers, 20 students):

```bash
npm run seed:full
```

This will create:
- **1 School**: Central High School
- **10 Teachers**: All teaching Class 10A (Mathematics, Physics, Chemistry, Biology, English, History, Geography, Romanian, French, Physical Education)
- **1 Classmaster**: Maria Popescu (Mathematics teacher)
- **20 Students**: All in Class 10A with grades across all subjects

**Default Login Credentials** (all passwords: `password123`):
- Admin: `admin@highschool.edu`
- Teachers: `maria.popescu@highschool.edu`, `ion.ionescu@highschool.edu`, etc.
- Students: `alexandru.popescu@highschool.edu`, `maria.ionescu@highschool.edu`, etc.

## 🌐 Deploying to Vercel

This app is configured to work on Vercel. Here's how it's set up:

### Project Structure for Vercel

- **Local Development**: `server.js` runs directly as an Express server
- **Vercel Deployment**: `/api/index.js` serves as the serverless function entry point

The `vercel.json` configuration:
- Serves static files (CSS, images) from the `public` directory automatically
- Routes all other requests to `/api/index.js`, which imports your Express app

### Deployment Steps

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your environment variables:
   - `SESSION_SECRET` - A random secret for session encryption
   - Any Firebase environment variables you need
4. Deploy!

The app will automatically:
- Serve static files from `public/` (like `styles.css`)
- Run your Express app as a serverless function
- Handle all routes through your Express application

**Note**: Make sure your `firebase-service-account.json` is either:
- Added as environment variables in Vercel, OR
- Included in your deployment (not recommended for security)

## 🎨 The Vibe

I went with a Vercel-inspired dark theme because, honestly, dark mode just hits different. It's easy on the eyes and looks super clean. The design is minimal and modern - no unnecessary stuff, just what you need.

## 🛠️ Tech Stack

- **Node.js** + **Express** - Backend framework
- **Vercel** - Hosting and serverless deployment
- **Firebase Firestore** - Database (because it's easy and scales)
- **EJS** - Templating engine
- **bcryptjs** - Password hashing (security matters!)
- **express-session** - User sessions

## 📁 Project Structure

```
online-gradebook/
├── api/                 # Vercel serverless functions
│   └── index.js        # Entry point for Vercel deployment
├── config/              # Firebase config
├── middleware/          # Auth middleware
├── models/             # User and School models
├── routes/             # Auth and admin routes
├── views/              # EJS templates
├── public/             # CSS and static files
├── utils/              # Utility functions (feedback generator)
├── server.js           # Main Express server (runs locally)
├── seed-full.js        # Full database seed (one school, 10 teachers, 20 students)
└── vercel.json         # Vercel configuration
```

## 🔐 Authentication

The app uses session-based authentication with **Two-Factor Authentication (2FA)** for enhanced security.

### 🔒 Two-Factor Authentication (2FA)

**Mandatory for:**
- School administrators
- Teachers

**How it works:**
1. Enter email and password
2. Receive 6-digit code via email
3. Enter code to complete login
4. Code expires in 10 minutes

**Setup required:**
```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
SCHOOL_NAME=Your School Name
```

See detailed setup instructions in `docs/2FA-SETUP.md`

**Test email configuration:**
```bash
npm run test:email
```

### Admin System

**Important:** Public registration is now disabled. Only admins can create new users.

#### Creating Your First Admin

After installing dependencies and setting up Firebase, you can either:

**Option 1: Use the seed file** (recommended for testing)
```bash
npm run seed:full
```
This creates an admin account: `admin@highschool.edu` (password: `password123`)

**Option 2: Create manually**
```bash
node create-admin.js
```

Follow the prompts to enter:
- Admin name
- Admin email
- Admin password (minimum 6 characters)

#### Admin Features

Once you have an admin account:
1. Login at `/auth/login`                       
2. You'll be automatically redirected to the admin panel
3. From there you can:
   - Create new students, teachers, and admins
   - View all registered users
   - Manage the entire system

### User Roles

- **Admin (School Admin)** - Can create and manage all users, assign teachers to classes, set classmasters, manage subjects and classes, has full system access
- **Teacher** - Can view students, add/edit/delete grades, record absences, view assigned classes. Classmasters can view detailed student profiles and motivate absences
- **Student** - Can view their own grades, absences, statistics, and receive personalized feedback
- **Parent** - Can view all their children's academic progress, grades, and absences

## 🎓 Grade System

This uses the Romanian grading system (1-10):
- **10** - Perfect, excellent work
- **9** - Very good
- **8** - Good
- **7** - Satisfactory
- **6** - Sufficient (barely passing)
- **5 and below** - Insufficient (failing)

### Grade Management

- **Add Grades**: Teachers can add grades for subjects they teach
- **Edit Grades**: Teachers can edit grades they added or for subjects they teach
- **Delete Grades**: Teachers can delete grades with proper authorization
- **Grade Authorization**: Teachers can only edit/delete grades for subjects they teach or grades they originally added

## 🤝 Contributing

If you want to contribute, feel free to fork it and send a PR. I'm open to suggestions and improvements!

## 📝 License

MIT License - do whatever you want with it!

## 🆕 Recent Features

- ✏️ **Edit/Delete Grades**: Teachers can now edit and delete grades with proper authorization
- 👔 **Classmaster View**: Enhanced student detail pages for classmasters
- 📊 **Academic Feedback**: Automated feedback generation based on grades and attendance
- 👨‍👩‍👧‍👦 **Parent Dashboard**: Parents can view all their children's academic progress
- 🎨 **Modern UI**: Apple-inspired white theme with clean, responsive design
- 🔒 **Enhanced Security**: Proper authorization checks for grade editing/deletion
- 🔐 **2FA Authentication**: Email-based two-factor authentication for admins and teachers

## 📋 Compliance with Romanian Standards

This application complies with **Order 3.896/2023** - Technical Standards for Electronic Gradebook:

✅ **Implemented:**
- Web-based access across devices (Art. 2)
- Mobile-ready responsive design (Art. 3)
- Role-based access control (Art. 14-20)
- Two-factor authentication for admins and teachers (Art. 6)
- **Automated backup system** (Art. 7-10)
  - Daily incremental backups at 2:00 AM
  - Monthly full backups on 1st of each month
  - Automatic retention management (30 daily, 12 monthly)
  - Manual backup and restore commands
- HTTPS support (Art. 5, 13)
- Timestamp tracking for operations
- Authorization checks (only teachers can modify grades)

⚠️ **Requires Configuration:**
- Second backup location for full compliance (Art. 7) - Configure cloud storage
- Complete audit logging (Art. 16) - Basic tracking exists, enhancement recommended
- API documentation (Art. 13) - Foundation exists

### Setup Guides

- **2FA Setup**: `docs/2FA-SETUP.md` and `docs/QUICK-START-2FA.md`
- **Backup System**: `docs/BACKUP-SYSTEM.md` and `docs/BACKUP-QUICK-START.md`

### Quick Backup Setup

```env
# Add to .env
ENABLE_AUTO_BACKUP=true
BACKUP_DIR=./backups
```

```bash
# Test backup system
npm run backup:now
npm run backup:list
```

## 💬 Final Thoughts

This project is basically my attempt at making school management software that doesn't look like it's from 2005. It's not perfect, but it's honest work.

If you have any questions or run into issues, feel free to open an issue. I'll try to help when I can!

Happy grading! 📚✨

