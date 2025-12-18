# 📚 Online Gradebook

Hey there! Welcome to my online gradebook project. This is a simple but sleek web app I built to help teachers manage student grades and students track their progress. Think of it as a mini school portal, but way more chill.

## 🎯 What's This About?

You know how managing grades can be a pain? This app tries to make it easier. Teachers can view students, manage classes, and track grades. Students can log in to see their grades and absences. Nothing too fancy, just what you need.

## ✨ What Can You Do?

### For Teachers
- 👀 View all registered students

### For Students
- 📈 See your grades across all subjects
- 📅 Track absences (motivated and unmotivated)
- 📊 View summary stats

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

## 🎨 The Vibe

I went with a Vercel-inspired dark theme because, honestly, dark mode just hits different. It's easy on the eyes and looks super clean. The design is minimal and modern - no unnecessary stuff, just what you need.

## 🛠️ Tech Stack

- **Node.js** + **Express** - Backend stuff
- **Firebase Firestore** - Database (because it's easy and scales)
- **EJS** - Templating (old school but it works)
- **bcryptjs** - Password hashing (security matters!)
- **express-session** - User sessions

## 📁 Project Structure

```
online-gradebook/
├── config/              # Firebase config
├── middleware/          # Auth middleware
├── models/             # User model
├── routes/             # Auth routes
├── views/              # EJS templates
├── public/             # CSS and static files
└── server.js           # Main server file
```

## 🔐 Authentication

The app uses session-based authentication. Passwords are hashed with bcrypt, so they're secure. Users can register as either a teacher or student, and each role sees different stuff.

## 🎓 Grade System

This uses the Romanian grading system (1-10):
- **10** - Perfect, excellent work
- **9** - Very good
- **8** - Good
- **7** - Satisfactory
- **6** - Sufficient (barely passing)
- **5 and below** - Insufficient (failing)

## 🚧 What's Next?

This is still a work in progress. Here's what I'm thinking about adding:

- [ ] Actually implement the class management
- [ ] Add grade input for teachers
- [ ] Build the reports section
- [ ] Add more stats and analytics
- [ ] Maybe add notifications?
- [ ] Export grades to PDF

## 🤝 Contributing

If you want to contribute, feel free to fork it and send a PR. I'm open to suggestions and improvements!

## 📝 License

MIT License - do whatever you want with it!

## 💬 Final Thoughts

This project is basically my attempt at making school management software that doesn't look like it's from 2005. It's not perfect, but it's honest work.

If you have any questions or run into issues, feel free to open an issue. I'll try to help when I can!

Happy grading! 📚✨

