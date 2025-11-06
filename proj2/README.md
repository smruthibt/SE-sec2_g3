<p align="center">
  <!-- DOI -->
  <a href="https://doi.org/10.5281/zenodo.17544828">
    <img src="https://zenodo.org/badge/DOI/10.5281/zenodo.17544828.svg" alt="DOI" />
  </a>

  <!-- CI Status -->
  <a href="https://github.com/Divyaka9/SE-sec2_g3/actions">
    <img src="https://github.com/Divyaka9/SE-sec2_g3/actions/workflows/ci.yml/badge.svg" alt="Judge0 CI Tests" />
  </a>

  <!-- Coverage -->
  <a href="https://github.com/Divyaka9/SE-sec2_g3/tree/main">
    <img src="https://img.shields.io/badge/coverage-~79%25-green" alt="Coverage" />
  </a>

  <!-- Judge0 Testing -->
  <a href="[https://github.com/Divyaka9/SE-sec2_g3/tree/main](https://github.com/Divyaka9/SE-sec2_g3/tree/main/proj2/judge0-frontend/src/__tests__)">
    <img src="https://img.shields.io/badge/tests-pytest%20%7C%20jest-blue" alt="Tests: pytest | jest" />
  </a>

  <!-- Food Delivery Testing -->
  <a href="[https://github.com/Divyaka9/SE-sec2_g3/tree/main/proj2/food-delivery/tests)">
    <img src="https://img.shields.io/badge/tests-jest-pink" alt="Tests: jest" />
  </a>

  <!-- Black -->
  <a href="https://black.readthedocs.io/">
    <img src="https://img.shields.io/badge/formatter-Black-000000?logo=python" alt="Black Formatter" />
  </a>

  <!-- License -->
  <a href="https://github.com/Divyaka9/SE-sec2_g3/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
  </a>
</p>

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" alt="Express" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" alt="JavaScript" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="Python" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" alt="MongoDB" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" alt="GitHub Actions" width="45" height="45"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg" alt="Jest" width="45" height="45"/>
</p>

# 🍽️ BiteCode Platform

**BiteCode** brings together food delivery and competitive programming in a unique, gamified experience. 

It allows users and competitive programmers to **order food and earn rewards** — getting **discounts on every order** through quick problem-solving challenges.  

After placing an order, the clock starts ticking ⏱️ — **solve a coding question before your delivery partner arrives** to earn **up to 20% off** your order!  

It’s where every byte earns you a bite!

---

## 🚀 Overview

BiteCode has been developed as part of CSC510 - Software Engineering project at NC State University to demonstrate the design and implementation of an interactive, dual-purpose web platform.

It combines two main components:

1. **Food Delivery Application**  
   A full-stack web app built using **MongoDB, Express.js, React, and Node.js (MERN)**.  
   It enables users to discover restaurants, browse menus, place orders, and participate in timed coding challenges that unlock instant rewards.

2. **Judge0 Frontend**  
   A React-based interface powered by the open-source **Judge0 API**, used to compile and execute code in real time.  
   This module handles the challenge portion — validating code submissions and dynamically calculating rewards or discounts based on user performance.

The repository also includes an **Archived** directory that stores earlier prototypes, development scripts, and reference materials used during the design phase.

---

## 🖥️ Demo

[![Watch the demo](https://img.youtube.com/vi/nOuNoA7Y1ng/hqdefault.jpg)](https://youtu.be/nOuNoA7Y1ng)

---

## 👥 Intended Users

- **Foodies & Customers** – who want to enjoy meals while participating in quick coding challenges to earn discounts.  
- **Competitive Programmers** – who love solving problems under real-world time pressure (literally racing the delivery timer).  
- **Developers & Students** – interested in exploring full-stack application design and API integration.  
- **Educators** – who want to adapt the concept into interactive classroom experiences combining logic and engagement.

---

## 🧩 Repository Structure

```
proj2/
│
├── food-delivery/               # MERN-based gamified food ordering system
│   ├── backend/                 # Express.js + MongoDB API for users, orders & rewards
│   ├── public/                  # Static assets (logos, images, icons)
│   ├── src/                     # React frontend components
│   │   ├── components/          # Reusable UI parts (Navbar, MenuCard, Cart, etc.)
│   │   ├── pages/               # Page-level views (Home, Menu, Checkout, Rewards)
│   │   ├── hooks/               # Custom React hooks (auth, cart, etc.)
│   │   ├── context/             # React context providers for state management
│   │   └── utils/               # Helper functions & constants
│   ├── seed/                    # Database seeding scripts (restaurant & menu data)
│   ├── package.json             # Dependencies and scripts
│   └── README.md                # Submodule-specific instructions
│
├── judge0-frontend/             # Interactive coding challenge platform
│   ├── public/                  # Static HTML & assets
│   ├── src/                     # React frontend source
│   │   ├── components/          # Core UI (Editor, Output, TestCases)
│   │   ├── services/            # API calls to Judge0 endpoints
│   │   ├── tests/               # Jest + React Testing Library test cases
│   │   ├── styles/              # CSS and theme files
│   │   └── utils/               # Common helpers (language mappings, formatting)
│   ├── package.json             # Dependencies and scripts
│   └── README.md                # Documentation for setup and config
│
├── Archived/                    # Older versions, experiments, or deprecated code
│   ├── legacy-frontend/         # Initial prototype of the frontend
│   ├── old-scripts/             # Utility scripts used during testing
│   └── notes/                   # Early design docs and drafts
│
├── .gitignore                   # Ignored files and directories
├── package-lock.json            # Dependency lockfile
├── README.md                    # Main project documentation (this file)
└── LICENSE                      # Project license (academic use)
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/yourusername/proj2.git
cd proj2
```

### 2️⃣ Setup the Food Delivery App
```bash
cd food-delivery
npm install
npm run dev
```
> Ensure MongoDB is running locally or update your `.env` with a valid connection URI.

### 3️⃣ Setup the Judge0 Frontend
```bash
cd judge0-frontend
npm install
npm start
```
By default, it connects to the public Judge0 API.  
You can modify `src/config.js` to point to your own hosted Judge0 instance.

---

## 🧠 Features

### 🍴 Food Delivery (Bite)
- Browse and search restaurants  
- Place and track orders  
- Earn real-time discounts by solving coding challenges  
- Reward system integrated with checkout flow  
- Admin features for menu & restaurant management

### 💻 Judge0 Frontend (Code)
- Compile and execute code in real time  
- Supports multiple languages (Python, C++, Java and JavaScript as of now)  
- Validate against predefined test cases  
- Reward/discount calculation based on correctness and time  
- Built using modular React components and REST API integration

---

## 📘 Use Cases

- **Gamified Ordering Experience:** Encourages logical thinking while waiting for food delivery.  
- **Educational Demonstrations:** Showcase of API integration, real-time feedback, and gamification.  
- **Developer Portfolio Project:** Highlights both full-stack and frontend engineering capabilities.  
- **Future Startup Concept:** Potential to extend into a commercial “order-and-earn” app for tech communities.

---

## 🧑‍💻 Technology Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React, Bootstrap, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| APIs | Judge0 (Open Source Execution API) |
| Testing | Jest, React Testing Library, pytest |
| Dev Tools | npm, Git, VS Code |
| DevOps Tools | Docker |

---

## 📂 Archived Work

The `Archived` directory includes:
- Early experimental versions of the platform  
- Prototype scripts and local testing setups  
- Documentation drafts and design iterations  

Preserved to trace the project’s evolution and serve as learning reference material.

---

## 🧾 Naming & Branding

The name BiteCode is an original and distinctive concept that merges food delivery and competitive programming into one engaging platform.
The name symbolizes the fusion of “Bite” — representing food and satisfaction — with “Code” — representing logic and creativity.

BiteCode reflects the spirit of fun learning and reward-driven engagement:

“Order, code, and earn — every bite makes you smarter.”

The name is unique, created specifically for this project, and free from any known trademark conflicts.

---

## 🧑‍🤝‍🧑 Contributors

| Name | Email id  |
|------| ----------|
| Soham Sarang Deshpande | sdeshpa5@ncsu.edu |
| Divya Kannan | dkannan2@ncsu.edu |
| Tejas Pavular Ramesh | tpavula@ncsu.edu |
| Mahek Kantharia | mrkantha@ncsu.edu |

---

## ✨ Achieved Milestones
- Developed a complete multi-role food delivery system supporting customers, restaurants, and drivers, with seamless order creation, assignment, and fulfillment workflows.
- Integrated a coding challenge micro-platform (Judge0) that dynamically generates cashback or coupon rewards based on challenge difficulty and user performance.
- Engineered automated coupon application logic — earned rewards are stored, validated, and directly applied during checkout for the next food order.
- Designed responsive, role-specific dashboards for restaurants, drivers, and customers with intuitive interfaces for menu management, order tracking, and payment processing.
- Implemented modular backend architecture using Express + MongoDB with clean separation of routes, models, and configurations, ensuring scalability and ease of testing.

---

## 🏁 Future Enhancements

- Adaptive Challenge Difficulty: Adjust coding task levels based on order frequency and past performance.
- Hook up your chess engine, share your toughest positions, and let players earn rewards solving them!
- Geolocation Tracking: Enable live driver location and delivery ETA via Google Maps integration.
- UI/UX & Stability Enhancements: Improve responsiveness, consistency, and overall performance across dashboards.
- Payment & Security Upgrades: Strengthen payment flows with verification, refunds, and secure logging.
- Unified login system for both modules (SSO)  
- Mobile-friendly PWA version  

---

## 📜 License

This project is licensed under the **MIT License** — you’re free to use, modify, and distribute this software, provided that the original copyright notice and permission notice are included in all copies or substantial portions of the software.

See the **[MIT License](../LICENSE)**. file for more details.


---

### 💬 Feedback

We welcome feedback, bug reports, and suggestions!  
Open an issue or submit a pull request to help improve **BiteCode**.

---

*Because coding's better with curry :)*
