require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const User = require('./models/User');

// Botni ishga tushirish
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// MongoDB'ga ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

connectDB();

// Vaqtinchalik foydalanuvchi ma'lumotlarini saqlash uchun obyekt
const userData = {};

// Start komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      keyboard: [
        [{ text: 'Taklif qoldirish' }],
        [{ text: 'Mening takliflarim' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };

  bot.sendMessage(chatId, 'Assalomu alaykum! Kerakli bo‘limni tanlang:', options);
});

// Foydalanuvchi xabarlarini boshqarish
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const username = msg.from.username || 'Username mavjud emas';

  // Agar foydalanuvchi ism-familiyani kiritayotgan bo'lsa
  if (userData[chatId]?.step === 'ask_name') {
    userData[chatId].name = text; // Ism va familiyani saqlash
    userData[chatId].step = 'ask_contact';
    requestContact(chatId); // Kontaktni so‘rash
    return;
  }

  // Agar foydalanuvchi kontakt yuborgan bo'lsa
  if (msg.contact && userData[chatId]?.step === 'ask_contact') {
    userData[chatId].phoneNumber = msg.contact.phone_number;
    userData[chatId].step = 'ask_offer';
    bot.sendMessage(chatId, 'Taklifingizni yozing:');
    return;
  }

  // Taklif qabul qilish va saqlash
  if (userData[chatId]?.step === 'ask_offer') {
    const offer = text;
    const { name, phoneNumber } = userData[chatId];

    // Ma'lumotni DB'ga saqlash yoki yangilash
    await User.findOneAndUpdate(
      { userId: chatId },
      { 
        $push: { offers: { name, offer, phoneNumber } } 
      },
      { upsert: true, new: true }
    );

    // Kanalga yuboriladigan xabar
    const message = `📝 *Yangi taklif*:\n\n👤 *Ism va familiya*: ${name}\n📱 *Telefon*: ${phoneNumber}\n📧 *Username*: @${username}\n💡 *Taklif*: ${offer}`;
    bot.sendMessage(process.env.CHANNEL_ID, message, { parse_mode: 'Markdown' });

    // Tasdiqlash xabari
    bot.sendMessage(chatId, 'Taklifingiz qabul qilindi!');

    // Vaqtinchalik ma'lumotlarni tozalash
    delete userData[chatId];
    return;
  }

  // Foydalanuvchining takliflarini ko‘rish
  if (text === 'Mening takliflarim') {
    const user = await User.findOne({ userId: chatId });

    if (user && user.offers.length > 0) {
      let response = 'Sizning takliflaringiz:\n\n';
      user.offers.forEach((offer, index) => {
        response += `${index + 1}. ${offer.name}\n📱 Telefon: ${offer.phoneNumber}\n💡 Taklif: ${offer.offer}\n🕰 Sana: ${offer.date.toLocaleString()}\n\n`;
      });

      bot.sendMessage(chatId, response);
    } else {
      bot.sendMessage(chatId, 'Siz hali birorta ham taklif qoldirmagansiz.');
    }
  }

  // Taklif qoldirish jarayonini boshlash
  if (text === 'Taklif qoldirish') {
    userData[chatId] = { step: 'ask_name' }; // Jarayonni boshlash
    bot.sendMessage(chatId, 'Iltimos, ismingiz va familiyangizni kiriting:');
  }
});

// Kontakt so‘rash funksiyasi
const requestContact = (chatId) => {
  const contactOptions = {
    reply_markup: {
      keyboard: [
        [{ 
          text: 'Kontaktingizni yuboring', 
          request_contact: true 
        }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    }
  };
  bot.sendMessage(chatId, 'Iltimos, kontaktingizni yuboring:', contactOptions);
};
