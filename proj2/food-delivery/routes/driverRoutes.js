// === Updated for Driver + Session ===
import express from "express";
import bcrypt from "bcrypt";
import Driver from "../models/Driver.js";
import DriverAuth from "../models/DriverAuth.js";

const router = express.Router();

// === Driver Registration ===
router.post("/register", async (req, res) => {
  try {
    const { fullName, address, vehicleType, vehicleNumber, licenseNumber, email, password } = req.body;

    const driver = new Driver({ fullName, address, vehicleType, vehicleNumber, licenseNumber });
    await driver.save();

    const hashed = await bcrypt.hash(password, 10);
    const auth = new DriverAuth({ email, password: hashed, driverId: driver._id });
    await auth.save();

    res.redirect("/driver-login.html");
  } catch (err) {
    console.error("Driver Registration Error:", err);
    res.status(500).send("Error registering driver: " + err.message);
  }
});

// === Driver Login with session ===
// === Driver Login with session ===
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const auth = await DriverAuth.findOne({ email }).populate("driverId");
    if (!auth) return res.status(400).send("Driver not found");

    const match = await bcrypt.compare(password, auth.password);
    if (!match) return res.status(400).send("Invalid password");

    // Save driver info in session
    req.session.driverId = auth.driverId._id;
    req.session.driverName = auth.driverId.fullName;

    // Redirect to welcome page (session will store name)
    res.redirect("/driver-dashboard.html");

  } catch (err) {
    console.error("Driver Registration Error:", err);
    res.status(500).send("Error logging in driver: " + err.message);
  }
});

// === Middleware to check if driver is logged in ===
export const requireDriverLogin = (req, res, next) => {
  if (!req.session.driverId) return res.redirect("/driver-login.html");
  next();
};

// === Driver Logout ===
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Could not log out.");
    res.redirect("/driver-login.html");
  });
});

// === Welcome page for logged-in driver ===
router.get("/welcome", (req, res) => {
  try {
    if (!req.session.driverId) return res.redirect("/driver-login.html");

    // Render a plain HTML page with the driver’s name
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Welcome Driver</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-4">
        <div class="container">
          <h2>Welcome, ${req.session.driverName}</h2>
          <p>You are successfully logged in.</p>
          <a href="/driver/logout" class="btn btn-danger">Logout</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Error in /welcome route:", err);
    res.status(500).send("Something went wrong while loading the welcome page.");
  }
});



export default router;
