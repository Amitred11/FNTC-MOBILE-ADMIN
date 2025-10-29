# 🐻 Fibear Network Technologies Corp. - A Full-Stack Capstone Project

![Project Status: Educational Capstone](https://img.shields.io/badge/Status-Educational%20Capstone-blueviolet) ![Partner: Fibear Network Technologies Corp.](https://img.shields.io/badge/Partner-Fibear%20Network%20Technologies%20Corp.-orange) ![License: All Rights Reserved](https://img.shields.io/badge/License-All%20Rights%20Reserved-red) ![Version: 4.0.56](https://img.shields.io/badge/Version-4.0.56-informational) ![Made For: Colegio de Montalban](https://img.shields.io/badge/Made%20For-Colegio%20de%20Montalban-blue)



This repository contains the full-stack source code for the **Fibear Internet Service** application, developed as a comprehensive educational capstone project. It serves as a practical demonstration of modern application development, from backend API design to a polished cross-platform mobile user experience.


## Features

*   **Dashboard Overview:** Provides a quick look at key metrics like total subscribers, overdue payments, and open tickets.
*   **Subscriber Management:** View, search, and manage subscriber details, including their active plans and billing history.
*   **Job Order Management:** Track and manage job orders, assign them to field agents, and update their status.
*   **Billing Management:** Create, view, and manage customer bills, including overdue and paid statuses.
*   **Ticket Management:** Handle customer support tickets, track their progress, and communicate with users.
*   **Live Chat:** Engage in real-time conversations with users and manage chat sessions.
*   **User Profile & Settings:** Admins can edit their profile, change passwords, and access app settings.
*   **Notifications:** Receive push notifications for important events and manage background task registrations.

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   Expo CLI: `npm install -g expo-cli`

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd ADMIN
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory of the project and add the following variables:
    ```    API_BASE_URL=YOUR_API_BASE_URL
    CONFIG_INTERNAL_API_KEY=YOUR_INTERNAL_API_KEY
    ```
    Replace `YOUR_API_BASE_URL` and `YOUR_INTERNAL_API_KEY` with your actual values. These can be found in your `app.config.js` file.

### Running the App

1.  **Start the Expo development server:**
    ```bash
    npx expo start
    ```

2.  **Run on your device or simulator:**
    *   **On Device:** Scan the QR code displayed in the terminal using the Expo Go app on your iOS or Android device.
    *   **On iOS Simulator:** Press `i` in the terminal.
    *   **On Android Emulator:** Press `a` in the terminal.

## Project Structure

```
ADMIN/
├── assets/               # Static assets like images and fonts
├── components/           # Reusable UI components
├── contexts/             # React Context providers for state management
├── hooks/                # Custom React hooks
├── navigation/           # Navigation configuration (AppNavigator)
├── screens/              # All app screens (AdminDashboard, UserManagement, etc.)
├── services/             # API service, notification service, etc.
├── App.js                # Main App component
├── App.json              # Expo configuration
├── babel.config.js       # Babel configuration
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Lock file for installed dependencies
└── .env                  # Environment variables (add this file)
└── .gitignore            # Git ignore file
```

## Environment Variables

The application relies on environment variables for configuration. Ensure you have a `.env` file in the root directory with the following:

*   `API_BASE_URL`: The base URL for your backend API.
*   `CONFIG_INTERNAL_API_KEY`: The internal API key for accessing certain configurations.

## 📄 Disclaimer

**This is an educational capstone project and is intended for our Community Partner.**

*   The application is for our Community Partner which is an Internet Service Provider.
*   All Datas and Functions are solely for our Community Partner

---

## 🎓 Author

This project was created by **Amitred11** in collaboration with **Fibear Network Technologies Corp.** as the culmination of their studies, showcasing the practical application of software engineering principles.
And Jovy Ann Molo for figma...

---

## 📜 License and Usage Rights

**© 2024 Amitred11. All Rights Reserved.**

This software and its associated source code are the proprietary property of the author and were developed in partnership with **Fibear Network Technologies Corp.**.

**Usage by the Community Partner:**
Our community partner, **Fibear Network Technologies Corp.**, is granted a non-exclusive, perpetual, royalty-free license to use, modify, and deploy this software for their internal operational purposes.

**General Usage Prohibited:**
All other parties are strictly prohibited from copying, distributing, modifying, or using this software for any commercial or non-commercial purpose without the express written permission of the author. This project is **not** open-source.
