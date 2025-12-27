const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
genreSchema.index({ name: 1 });

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;
