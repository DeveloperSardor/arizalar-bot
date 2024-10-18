const mongoose = require('mongoose');

// Takliflar uchun alohida schema
const OfferSchema = new mongoose.Schema({
  name: String,
  offer: String,
  phoneNumber: String,
  date: { type: Date, default: Date.now }
});

// Foydalanuvchi uchun schema
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  offers: [OfferSchema]
});

module.exports = mongoose.model('User', UserSchema);
