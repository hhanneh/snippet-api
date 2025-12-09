// 1. IMPORTS
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // UUSI: Tokeneille
const bcrypt = require('bcryptjs');  // UUSI: Salasanoille
require('dotenv').config();

// 2. CONFIGURATION
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "salainenavain123"; // Oikeassa projektissa tämä .env tiedostoon!

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 4. DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('DB Connection Error:', err));

// ==========================================
// 5. SCHEMAS (TIETOKANTAMALLIT)
// ==========================================

// A) USER SCHEMA (Tämä puuttui!)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// B) SNIPPET / ITEM SCHEMA
// React frontend kutsuu näitä "items", joten pidetään rakenne joustavana
const snippetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: false }, // Ei pakollinen jotta dashboard toimii helpommin
  user_id: { type: String } // Voidaan tallentaa kuka loi itemin
});
const Snippet = mongoose.model('Snippet', snippetSchema);


// ==========================================
// 6. ROUTES
// ==========================================

// TEST ROUTE
app.get('/', (req, res) => res.send('API is running!'));

// --- AUTH ROUTES (LOGIN & REGISTER) ---

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Tarkista onko käyttäjä jo olemassa
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Salaa salasana
    const hashedPassword = await bcrypt.hash(password, 10);

    // Luo käyttäjä
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Etsi käyttäjä
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Tarkista salasana
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Luo token
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });

    res.json({ token, user: { email: user.email, id: user._id } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- DATA ROUTES ---

// HUOM: Frontendisi App.jsx käyttää osoitetta "/api/items" Dashboardissa.
// Laitetaan reitti kuuntelemaan sitä.
app.get('/api/items', async (req, res) => {
  try {
    const items = await Snippet.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    // Frontend lähettää { title: "..." }
    const newItem = new Snippet(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await Snippet.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 7. START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});