// server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/habesha')
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error(err));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
}));

// ---------- Profile model ----------
const Profile = mongoose.model('Profile', new mongoose.Schema({
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  firstName:  String,
  age:        Number,
  gender:     String,
  languages:  String,
  culture:    String,
  interests:  String,
  createdAt:  { type: Date, default: Date.now }
}));

// ---------- friendly root ----------
app.get('/', (_, res) =>
  res.send(`
    <h1>Habesha Dating API 👋</h1>
    <p>POST <code>/api/auth/register</code> &nbsp; <code>{email, password}</code></p>
    <p>POST <code>/api/auth/login</code> &nbsp; <code>{email, password}</code></p>
    <p>POST <code>/api/profile</code> &nbsp; (JWT required)</p>
  `)
);

// ---------- registration ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email & password required' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    res.json({ id: user._id, email: user.email });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ msg: 'Email already exists' });
    res.status(500).json({ msg: 'Server error' });
  }
});

// ---------- JWT login ----------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email & password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ uid: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ---------- JWT middleware ----------
function auth(req, res, next){
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ msg: 'Token required' });
  try {
    const token = hdr.split(' ')[1];
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    req.uid = uid;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
}

// ---------- create / update profile ----------
app.post('/api/profile', auth, async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { owner: req.uid },
      { ...req.body, owner: req.uid },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (e) {
    res.status(500).json({ msg: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API on ${port}`));
