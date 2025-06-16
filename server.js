const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const users = [];
const items = [
  {
    id: 1,
    name: "Smartphone X12 Pro",
    description: "5G smartphone, 256GB storage, 6.7\" AMOLED, triple 48MP camera",
    category: "Phones",
    startingBid: 350.00,
    reservePrice: 400.00,
    buyNowPrice: 480.00,
    currentBid: 399.99,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 2,
    name: "4K OLED Smart TV",
    description: "65\" Ultra HD, HDR10+, Dolby Vision, 120Hz, built-in Alexa",
    category: "TVs",
    startingBid: 900.00,
    reservePrice: 950.00,
    buyNowPrice: 1140.00,
    currentBid: 999.99,
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 3,
    name: "Wireless ANC Headphones",
    description: "Over-ear, 30-hour battery, active noise cancellation, Bluetooth 5.2",
    category: "Audio",
    startingBid: 150.00,
    reservePrice: 180.00,
    buyNowPrice: 216.00,
    currentBid: 199.99,
    endTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 4,
    name: "UltraBook Pro 14",
    description: "14\" 2.8K display, Intel i7, 16GB RAM, 512GB SSD, 18-hour battery",
    category: "Laptops",
    startingBid: 800.00,
    reservePrice: 900.00,
    buyNowPrice: 1080.00,
    currentBid: 850.00,
    endTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 5,
    name: "Smartwatch Series 7",
    description: "1.9\" Retina display, heart rate monitor, GPS, water-resistant",
    category: "Wearables",
    startingBid: 200.00,
    reservePrice: 250.00,
    buyNowPrice: 300.00,
    currentBid: 220.00,
    endTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 6,
    name: "Gaming Console X",
    description: "4K gaming, 1TB SSD, ray tracing, 120FPS support",
    category: "Consoles",
    startingBid: 400.00,
    reservePrice: 450.00,
    buyNowPrice: 540.00,
    currentBid: 420.00,
    endTime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 7,
    name: "Wireless Earbuds Pro",
    description: "True wireless, 24-hour battery, IPX7 waterproof, touch controls",
    category: "Audio",
    startingBid: 100.00,
    reservePrice: 120.00,
    buyNowPrice: 144.00,
    currentBid: 110.00,
    endTime: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 8,
    name: "Drone Quadcopter 4K",
    description: "4K camera, 30-min flight time, GPS, obstacle avoidance",
    category: "Drones",
    startingBid: 300.00,
    reservePrice: 350.00,
    buyNowPrice: 420.00,
    currentBid: 320.00,
    endTime: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 9,
    name: "Smart Home Hub",
    description: "Voice-controlled, Zigbee/Z-Wave, supports 100+ devices",
    category: "Smart Home",
    startingBid: 80.00,
    reservePrice: 100.00,
    buyNowPrice: 120.00,
    currentBid: 90.00,
    endTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  },
  {
    id: 10,
    name: "VR Headset Pro",
    description: "4K OLED display, 110° FOV, wireless PC streaming, 6DOF",
    category: "VR",
    startingBid: 500.00,
    reservePrice: 550.00,
    buyNowPrice: 660.00,
    currentBid: 520.00,
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    bidHistory: [],
    status: "active",
    winner: null
  }
];
const autoBids = {};
const userBids = {};
const userWon = {};

const JWT_SECRET = 'your_jwt_secret_key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, email, password: hashedPassword };
  users.push(user);
  userBids[user.id] = [];
  userWon[user.id] = [];
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/user/bids', authenticateToken, (req, res) => {
  const userId = req.user.id;
  res.json({ bids: userBids[userId] || [], won: userWon[userId] || [] });
});

const processAutoBids = (itemId, currentBid, bidderId, username) => {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  const autoBidders = autoBids[itemId] || {};
  for (const userId in autoBidders) {
    if (userId != bidderId && autoBidders[userId] > currentBid) {
      const newBid = Math.min(autoBidders[userId], currentBid + 10);
      item.currentBid = newBid;
      item.bidHistory.push({ username: users.find(u => u.id == userId)?.username || 'Unknown', amount: newBid, time: new Date().toISOString() });
      userBids[userId] = userBids[userId] || [];
      userBids[userId].push({ itemId, amount: newBid, time: new Date().toISOString(), itemName: item.name });
      io.emit('bidUpdate', item);
      io.emit('notification', { message: `You were outbid on ${item.name}! Current bid: $${newBid.toFixed(2)}`, userId: bidderId });
      if (autoBidders[userId] <= newBid) {
        delete autoBids[itemId][userId];
      }
      return true;
    }
  }
};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('placeBid', ({ itemId, bid, userId, username }) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.status === 'active' && bid > item.currentBid) {
      item.currentBid = bid;
      item.bidHistory.push({ username, amount: bid, time: new Date().toISOString() });
      userBids[userId] = userBids[userId] || [];
      userBids[userId].push({ itemId, amount: bid, time: new Date().toISOString(), itemName: item.name });
      io.emit('bidUpdate', item);
      if (processAutoBids(itemId, bid, userId, username)) {
        processAutoBids(itemId, item.currentBid, userId, username);
      }
    }
  });

  socket.on('setAutoBid', ({ itemId, maxBid, userId, username }) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.status === 'active' && maxBid > item.currentBid) {
      if (!autoBids[itemId]) autoBids[itemId] = {};
      autoBids[itemId][userId] = maxBid;
      const newBid = item.currentBid + 10;
      if (newBid <= maxBid) {
        item.currentBid = newBid;
        item.bidHistory.push({ username, amount: newBid, time: new Date().toISOString() });
        userBids[userId] = userBids[userId] || [];
        userBids[userId].push({ itemId, amount: newBid, time: new Date().toISOString(), itemName: item.name });
        io.emit('bidUpdate', item);
        processAutoBids(itemId, newBid, userId, username);
      }
    }
  });

  socket.on('buyNow', ({ itemId, userId, username }) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.status === 'ended' && item.currentBid < item.reservePrice) {
      item.currentBid = item.buyNowPrice;
      item.status = 'sold';
      item.winner = username;
      userWon[userId] = userWon[userId] || [];
      userWon[userId].push(item);
      io.emit('bidUpdate', item);
      io.emit('notification', { message: `${username} purchased ${item.name} for $${item.buyNowPrice.toFixed(2)}!`, userId: null });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

setInterval(() => {
  const now = new Date();
  items.forEach(item => {
    if (item.status === 'active' && new Date(item.endTime) <= now) {
      item.status = 'ended';
      if (item.currentBid >= item.reservePrice) {
        const lastBid = item.bidHistory.slice(-1)[0];
        if (lastBid) {
          item.winner = lastBid.username;
          const winnerId = users.find(u => u.username === lastBid.username)?.id;
          if (winnerId) {
            userWon[winnerId] = userWon[winnerId] || [];
            userWon[winnerId].push(item);
            io.emit('notification', { message: `You won ${item.name} for $${item.currentBid.toFixed(2)}!`, userId: winnerId });
          }
        }
      }
      io.emit('auctionEnded', item);
      io.emit('notification', { message: `Auction for ${item.name} has ended! Final bid: $${item.currentBid.toFixed(2)}`, userId: null });
    }
  });
}, 1000);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});