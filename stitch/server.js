const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the stitch directory
app.use(express.static(__dirname));

// Proxy API requests to the backend
app.use('/api', (req, res) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  
  // Parse the backend URL
  const url = new URL(backendUrl);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: `/api${req.url}`, // Add back the /api prefix
    method: req.method,
    headers: req.headers,
  };
  
  console.log(`${req.method} ${req.url} -> ${backendUrl}/api${req.url}`);
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  });
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_dashboard_overview', 'code.html'));
});

// Serve other pages
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_dashboard_overview', 'code.html'));
});

app.get('/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_url_scanner_&_ai_analysis', 'code.html'));
});

app.get('/risk-engine', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_ai_risk_engine_details', 'code.html'));
});

app.get('/forensics', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_forensics_database', 'code.html'));
});

app.get('/alerts', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_alerts_center_feed', 'code.html'));
});

app.get('/recruiter', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_recruiter_intelligence', 'code.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_platform_settings', 'code.html'));
});

app.get('/heatmap', (req, res) => {
  res.sendFile(path.join(__dirname, 'sentinelx_global_heatmap_monitor', 'code.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'SentinelX Frontend' });
});

// Start server
app.listen(PORT, () => {
  console.log(`SentinelX Frontend server running on port ${PORT}`);
  console.log(`Backend proxy pointing to: ${process.env.BACKEND_URL || 'http://localhost:5001'}`);
});