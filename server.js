// server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { config } from 'dotenv';

config();
const app = express();
app.use(cors());
app.use(express.json());

// Mongo stub (Render provides MONGO_URI)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/habesha')
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error(err));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
}));

// ---------- tiny register route ----------
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

app.get('/', (_, res) => res.send('Habesha Dating API ok'));
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API on ${port}`));
