import express from 'express';
import bcrypt from 'bcrypt';
import Supermarket from '../models/Supermarket.js';

const router = express.Router();
const norm = (e = '') => e.trim().toLowerCase();

// Register new supermarket (with owner credentials)
router.post('/register', async (req, res) => {
  try {
    let { name, description, email, password, address } = req.body || {};
    if (!name || !email || !password || !address) {
      return res
        .status(400)
        .json({ error: 'name, email, password and address required' });
    }

    const normalizedEmail = norm(email);

    const exists = await Supermarket.findOne({ ownerEmail: normalizedEmail });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const supermarket = await Supermarket.create({
      name,
      description: description || '',
      address,
      rating: 4.5,
      deliveryFee: 0,
      etaMins: 30,
      ownerEmail: normalizedEmail,
      passwordHash
    });

    req.session.regenerate((err) => {
      if (err) {
        console.error('Supermarket session regenerate error:', err);
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.supermarketId = String(supermarket._id);
      req.session.supermarketName = supermarket.name;

      res.status(201).json({
        ok: true,
        message: `Welcome ${supermarket.name}! Registration successful.`,
        supermarket: {
          id: supermarket._id,
          name: supermarket.name,
          address: supermarket.address
        },
        owner: { email: normalizedEmail }
      });
    });
  } catch (err) {
    console.error('❌ Supermarket Registration Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login existing supermarket owner
router.post('/login', async (req, res) => {
  try {
    const email = norm(req.body?.email);
    const password = req.body?.password || '';

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'email and password required' });
    }

    const supermarket = await Supermarket.findOne({ ownerEmail: email });
    if (!supermarket) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, supermarket.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Supermarket session regenerate error:', err);
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.supermarketId = String(supermarket._id);
      req.session.supermarketName = supermarket.name;

      res.json({
        ok: true,
        message: `Welcome ${supermarket.name}!`,
        supermarket: {
          id: supermarket._id,
          name: supermarket.name,
          address: supermarket.address
        }
      });
    });
  } catch (err) {
    console.error('❌ Supermarket Login Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check session
router.get('/me', (req, res) => {
  if (!req.session.supermarketId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  res.json({
    ok: true,
    message: `Welcome ${req.session.supermarketName}!`,
    supermarketId: req.session.supermarketId
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logged out' });
  });
});

export default router;
