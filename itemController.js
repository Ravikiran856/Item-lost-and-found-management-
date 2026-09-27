const Item = require('../models/Item');
const fs = require('fs');
const path = require('path');

exports.addItem = async (req, res) => {
  try {
    const { name, type, item_type, description, location, contact } = req.body;
    const user_id = req.user ? req.user.id : null;
    const image_path = req.file ? req.file.filename : null;
    const item = new Item({ name, type, item_type, description, location, contact, image_path, user_id });
    await item.save();
    console.log('Item added:', item.name, 'by user', req.user.id);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getItems = async (req, res) => {
  try {
    const { type = 'all', search, page = 1, limit = 10 } = req.query;
    let query = {};
    if (type !== 'all') query.type = type;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ];
    const items = await Item.find(query).populate('user_id', 'name email').skip((page - 1) * limit).limit(limit);
    const total = await Item.countDocuments(query);
    console.log('Get items: found', items.length, 'items');
    res.json({ items, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getItemById = async (req, res) => {
  const item = await Item.findById(req.params.id).populate('user_id', 'name email');
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (item.image_path) {
      fs.unlink(path.join('uploads', item.image_path), (err) => { if (err) console.log(err); });
    }
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const lostItems = await Item.find({ user_id: userId, type: 'lost' });
    const foundItems = await Item.find({ type: 'found' });
    if (lostItems.length === 0) {
      return res.json({ matches: [], message: 'You have no lost items to match against found items.' });
    }
    if (foundItems.length === 0) {
      return res.json({ matches: [], message: 'No found items available to match.' });
    }
    const matches = [];
    for (const lost of lostItems) {
      for (const found of foundItems) {
        const textSim = textSimilarity(lost.description, found.description);
        let locSim = 0;
        if (lost.location && found.location) {
          const lostCoords = parseCoords(lost.location);
          const foundCoords = parseCoords(found.location);
          if (lostCoords && foundCoords) {
            const dist = getDistance(lostCoords, foundCoords);
            locSim = Math.max(0, 1 - dist / 10); // 10km max
          } else {
            // If no coordinates, compare location strings
            locSim = textSimilarity(lost.location, found.location);
          }
        }
        const totalSim = (textSim * 0.7 + locSim * 0.3) * 100;
        if (totalSim > 0) { // lower threshold for display
          matches.push({
            lostItem: lost,
            foundItem: found,
            similarity: totalSim
          });
        }
      }
    }
    matches.sort((a, b) => b.similarity - a.similarity);
    res.json({ matches: matches.slice(0, 10) }); // top 10
  } catch (error) {
    res.status(500).json({ message: 'Error finding matches' });
  }
};

function parseCoords(str) {
  const match = str.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

function getDistance(coord1, coord2) {
  const R = 6371;
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

function textSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
