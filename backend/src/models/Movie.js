const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  // External IDs
  tmdbId: {
    type: Number,
    sparse: true,
    index: true
  },
  imdbId: {
    type: String,
    sparse: true,
    index: true
  },
  justWatchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  originalTitle: {
    type: String,
    trim: true
  },
  overview: {
    type: String,
    default: null
  },
  tagline: {
    type: String,
    default: null
  },

  // Release Information
  releaseDate: {
    type: Date,
    default: null,
    index: true
  },
  releaseYear: {
    type: Number,
    default: null,
    index: true
  },

  // Media Details
  runtime: {
    type: Number, // in minutes
    default: null
  },
  posterPath: {
    type: String,
    default: null
  },
  backdropPath: {
    type: String,
    default: null
  },

  // Ratings and Popularity
  voteAverage: {
    type: Number,
    default: null,
    min: 0,
    max: 10
  },
  voteCount: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },

  // Relationships
  genres: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
  }],

  // Status
  status: {
    type: String,
    enum: ['rumored', 'planned', 'in_production', 'post_production', 'released', 'canceled'],
    default: 'released'
  },
  
  // Metadata
  originalLanguage: {
    type: String,
    default: null
  },
  spokenLanguages: [{
    iso: String,
    name: String
  }],
  productionCountries: [{
    iso: String,
    name: String
  }],

  // Cast & Crew
  directors: [{
    tmdbId: Number,
    name: String,
    profilePath: String
  }],

  cast: [{
    tmdbId: Number,
    name: String,
    character: String,
    profilePath: String,
    order: Number
  }],

  writers: [{
    tmdbId: Number,
    name: String,
    profilePath: String,
    job: String  // "Screenplay", "Writer", etc.
  }],

  productionCompanies: [{
    tmdbId: Number,
    name: String,
    logoPath: String,
    originCountry: String
  }],

  // Denormalized platform availability for easy filtering
  platforms: [{
    platformId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Platform'
    },
    platformName: String,
    platformSlug: String,
    monetizationTypes: [String]
  }],

  // Enrichment Status
  isEnriched: {
    type: Boolean,
    default: false
  },
  lastEnrichedAt: {
    type: Date,
    default: null
  },

  // Timestamps
  firstSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
movieSchema.index({ releaseYear: -1, popularity: -1 });
movieSchema.index({ voteAverage: -1, voteCount: -1 });
movieSchema.index({ genres: 1, releaseYear: -1 });

// Indexes for cast/crew and platform searches
movieSchema.index({ 'directors.name': 1 });
movieSchema.index({ 'cast.name': 1 });
movieSchema.index({ 'platforms.platformSlug': 1 });

// Virtual for full poster URL
movieSchema.virtual('posterUrl').get(function() {
  return this.posterPath ? `https://image.tmdb.org/t/p/w500${this.posterPath}` : null;
});

// Virtual for full backdrop URL
movieSchema.virtual('backdropUrl').get(function() {
  return this.backdropPath ? `https://image.tmdb.org/t/p/original${this.backdropPath}` : null;
});

// Ensure virtuals are included in JSON
movieSchema.set('toJSON', { virtuals: true });
movieSchema.set('toObject', { virtuals: true });

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;