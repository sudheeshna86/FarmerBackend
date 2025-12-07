import mongoose from 'mongoose';

const farmerListingSchema = new mongoose.Schema({
  farmer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},

  cropName: {
    type: String,
    required: [true, 'Please enter the crop name']
  },
  category: {
    type: String,
    required: [true, 'Please select a category']
  },
  quantity: {
    type: Number,
    required: [true, 'Please enter the quantity']
  },
  actualquantity:{
    type:Number,
    required: true,
  },
  pricePerKg: {
    type: Number,
    required: [true, 'Please enter the price per kg']
  },
  location: {
    type: String,
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
    default: "https://via.placeholder.com/400" // fallback placeholder
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FarmerListing = mongoose.model('FarmerListing', farmerListingSchema);
export default FarmerListing;
