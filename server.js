const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'elite-admin-2024';
const DATA_FILE = path.join(__dirname, 'data', 'assessments.json');

app.use(cors());
app.use(express.json({ limit: '50kb' }));

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function readAssessments() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function saveAssessments(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ELITE Assessment Backend' });
});

app.post('/submit-assessment', (req, res) => {
  const {
    candidateName, email, employeeId, role, experience,
    assessmentDate, scores, cefrLevel, overallScore,
    behavioralObservations, report, transcript
  } = req.body;

  if (!candidateName || !email || !scores || !report) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const record = {
    id: uuidv4(),
    submittedAt: new Date().toISOString(),
    candidate: { name: candidateName, email, employeeId: employeeId || null, role: role || null, experience: experience || null },
    assessmentDate: assessmentDate || new Date().toISOString().split('T')[0],
    overallScore, cefrLevel, scores,
    behavioralObservations: behavioralObservations || null,
    report, transcript: transcript || null
  };

  const all = readAssessments();
  all.push(record);
  saveAssessments(all);

  console.log(`[ELITE] Submitted: ${candidateName} — Score: ${overallScore}, CEFR: ${cefrLevel}`);

  return res.status(200).json({
    success: true,
    message: 'Thank you for completing the ELITE assessment. Please contact HR - C,L&D for your results.'
  });
});

app.get('/admin/assessments', adminAuth, (req, res) => {
  const all = readAssessments();
  const summary = all.map(r => ({
    id: r.id, submittedAt: r.submittedAt,
    name: r.candidate.name, email: r.candidate.email,
    employeeId: r.candidate.employeeId, role: r.candidate.role,
    assessmentDate: r.assessmentDate, overallScore: r.overallScore, cefrLevel: r.cefrLevel
  }));
  res.json({ total: summary.length, assessments: summary });
});

app.get('/admin/assessments/:id', adminAuth, (req, res) => {
  const record = readAssessments().find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found.' });
  res.json(record);
});

app.delete('/admin/assessments/:id', adminAuth, (req, res) => {
  let all = readAssessments();
  const before = all.length;
  all = all.filter(r => r.id !== req.params.id);
  if (all.length === before) return res.status(404).json({ error: 'Not found.' });
  saveAssessments(all);
  res.json({ success: true });
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

app.listen(PORT, () => {
  console.log(`ELITE Backend running on port ${PORT}`);
});
