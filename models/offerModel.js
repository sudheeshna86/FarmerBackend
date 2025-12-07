import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FarmerListing',
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  quantity: {
    type: Number,
    required: true,
  },
  offeredPrice: {
    type: Number,
    required: true,
  },
   counterOffers: [
    {
      price: { type: Number, required: true },
      counteredBy: { type: String, enum: ["farmer", "buyer"], required: true },
      timestamp: { type: Date, default: Date.now }
    }],
  notes: {
    type: String,
    default: '',
  },
  lastActionBy: {
  type: String,
  enum: ["farmer", "buyer", null],
  default: null,
},

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
