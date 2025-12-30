const express = require('express');
const mongoose = require('mongoose');
const catalogUpdateJob = require('../../jobs/catalogUpdateJob');

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/health/detailed
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      ingestionJob: 'unknown'
    }
  };

  // Check MongoDB
  if (mongoose.connection.readyState === 1) {
    health.services.database = 'connected';
  } else {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Check ingestion job
  try {
    const jobStatus = catalogUpdateJob.getStatus();
    health.services.ingestionJob = jobStatus.isScheduled ? 'scheduled' : 'not_scheduled';
    health.jobDetails = jobStatus;
  } catch {
    health.services.ingestionJob = 'error';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health
  });
});

module.exports = router;
