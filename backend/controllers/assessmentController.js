const Assessment = require('../models/assessment');
const Result = require('../models/result');
const User = require('../models/user');

// Start new assessment
const startAssessment = async (req, res) => {
  try {
    const { userId, questions } = req.body;
    
    // In future: Generate adaptive questions based on ML
    // For now, accept pre-generated questions
    
    const assessment = await Assessment.create({
      userId,
      questions,
      status: 'in_progress'
    });
    
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit assessment answers
const submitAssessment = async (req, res) => {
  try {
    const { assessmentId, answers } = req.body;

    // Validate inputs early

    // Basic validation to return clearer errors
    if(!assessmentId) return res.status(400).json({ message: 'assessmentId is required' })
    if(!Array.isArray(answers)) return res.status(400).json({ message: 'answers must be an array' })
    if(!req.user || !req.user.id) return res.status(401).json({ message: 'Not authorized' })

    // Load the assessment to get correct answers and question metadata
    const assessment = await Assessment.findById(assessmentId);
    if(!assessment) return res.status(404).json({ message: 'Assessment not found' });

    // Determine correctness using assessment.questions by matching questionId -> question
    const questionMap = {}
    assessment.questions.forEach(q => { questionMap[q._id.toString()] = q })

    let correctCount = 0
    const domainTotals = { number_sense: 0, arithmetic: 0, spatial: 0, memory: 0 }
    const domainCorrect = { number_sense: 0, arithmetic: 0, spatial: 0, memory: 0 }

    const processedAnswers = answers.map(a => {
      const q = questionMap[(a.questionId || '')]
      const correct = q ? String(q.correctAnswer) : null
      const selected = String(a.selectedAnswer ?? a.selected ?? '')
      const isCorrect = correct !== null && selected === String(correct)
      if(isCorrect) correctCount++
      const qType = q ? String(q.questionType) : 'unknown'
      if(domainTotals[qType] !== undefined) domainTotals[qType]++
      if(isCorrect && domainCorrect[qType] !== undefined) domainCorrect[qType]++
      return { ...a, isCorrect, responseTime: a.responseTime || 0 }
    })

    const totalQuestions = answers.length || 1
    const totalScore = (correctCount / totalQuestions) * 100

    // compute per-domain percentages
    const scores_snake = {
      total: totalScore,
      number_sense: domainTotals['number_sense'] ? Math.round((domainCorrect['number_sense'] / domainTotals['number_sense']) * 100) : 0,
      arithmetic: domainTotals['arithmetic'] ? Math.round((domainCorrect['arithmetic'] / domainTotals['arithmetic']) * 100) : 0,
      spatial: domainTotals['spatial'] ? Math.round((domainCorrect['spatial'] / domainTotals['spatial']) * 100) : 0,
      memory: domainTotals['memory'] ? Math.round((domainCorrect['memory'] / domainTotals['memory']) * 100) : 0
    }

    // Provide both snake_case and camelCase keys so frontend can read either
    const scores = {
      total: scores_snake.total,
      number_sense: scores_snake.number_sense,
      arithmetic: scores_snake.arithmetic,
      spatial: scores_snake.spatial,
      memory: scores_snake.memory,
      // camelCase aliases
      numberSense: scores_snake.number_sense,
      totalScore: scores_snake.total
    }

    // simple error pattern detection
    const errorPatterns = { numberReversal: 0, symbolConfusion: 0, sequencingError: 0 }
    processedAnswers.forEach(pa => {
      const q = questionMap[(pa.questionId || '')]
      if(!q) return
      const corr = String(q.correctAnswer ?? '')
      const sel = String(pa.selectedAnswer ?? pa.selected ?? '')
      if(corr && sel.length === corr.length && sel.split('').reverse().join('') === corr) errorPatterns.numberReversal++
      if(/[><=]/.test(String(q.questionText || '')) && /\d/.test(sel) && !/[><=]/.test(sel)) errorPatterns.symbolConfusion++
      if(String(q.questionType || '').toLowerCase().includes('memory')){
        const corrNum = Number(corr)
        const selNum = Number(sel)
        if(!Number.isNaN(corrNum) && !Number.isNaN(selNum) && Math.abs(corrNum - selNum) === 1) errorPatterns.sequencingError++
      }
    })

    // compute subtype counts per domain (if assessment.questions include a 'subtype' field)
    const subtypeCounts = {};
    (assessment.questions || []).forEach(q => {
      const domain = q.questionType || 'unknown'
      const sub = q.subtype || q.subType || 'default'
      if(!subtypeCounts[domain]) subtypeCounts[domain] = {}
      subtypeCounts[domain][sub] = (subtypeCounts[domain][sub] || 0) + 1
    })

    // Determine risk (placeholder - will be ML based)
    let dyscalculiaRiskIndex = 'low';
    if (totalScore < 60) dyscalculiaRiskIndex = 'moderate';
    if (totalScore < 40) dyscalculiaRiskIndex = 'high';

    const result = await Result.create({
      userId: req.user.id, // From auth middleware
      assessmentId,
      answers: processedAnswers,
      scores,
      subtypeCounts,
      errorPatterns: {
        numberReversal: errorPatterns.numberReversal,
        symbolConfusion: errorPatterns.symbolConfusion,
        sequencingError: errorPatterns.sequencingError
      },
      dyscalculiaRiskIndex,
      confidenceScore: Math.random() * 100
    });
    
    // Update assessment status
    await Assessment.findByIdAndUpdate(assessmentId, {
      status: 'completed',
      completedAt: new Date()
    });
    
    res.status(201).json(result);
  } catch (error) {
    // Log full error server-side for diagnosis and return message
    console.error('submitAssessment error:', error)
    res.status(500).json({ message: error.message });
  }
};

// Get user results
const getUserResults = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.id })
      .populate('assessmentId', 'startedAt completedAt')
      .sort({ createdAt: -1 });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export results as CSV for a user (self or by teacher/admin/linked parent)
const exportResultsCSV = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user.id;

    // Authorization
    if (String(targetUserId) !== String(req.user.id)) {
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        // allowed
      } else if (req.user.role === 'parent') {
        const child = await User.findById(targetUserId).select('childProfile');
        if (!child) return res.status(404).json({ message: 'User not found' });
        if (!child.childProfile || String(child.childProfile) !== String(req.user.id)) {
          return res.status(403).json({ message: 'Not authorized to export this child data' });
        }
      } else {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const results = await Result.find({ userId: targetUserId })
      .populate('assessmentId', 'startedAt completedAt')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    /* ================= CSV HEADER ================= */
    const headers = [
      'resultId',
      'assessmentId',
      'userId',
      'userName',
      'userEmail',
      'createdAt',

      'totalScore',
      'number_sense',
      'arithmetic',
      'spatial',
      'memory',

      // ⏱ TIME DATA
      'totalTimeSeconds',
      'perQuestionTimeSeconds',

      'dyscalculiaRiskIndex',
      'confidenceScore',
      'numberReversal',
      'symbolConfusion',
      'sequencingError',
      'subtypeCounts'
    ];

    const rows = [headers.join(',')];

    /* ================= ROW DATA ================= */
    results.forEach(r => {
      const scores = r.scores || {};
      const patterns = r.errorPatterns || {};
      const subtypeStr = JSON.stringify(r.subtypeCounts || {});
      const answers = r.answers || [];

      // ⏱ TOTAL TIME
      const totalTimeMs = answers.reduce(
        (sum, a) => sum + (a.responseTime || 0),
        0
      );
      const totalTimeSeconds = Math.round(totalTimeMs / 1000);

      // ⏱ PER QUESTION TIME (CSV-safe JSON)
      const perQuestionTimeSeconds = JSON.stringify(
        answers.map(a => ({
          questionId: a.questionId,
          timeSeconds: Math.round((a.responseTime || 0) / 1000),
          attempts: a.attempts || 1,
          isCorrect: a.isCorrect
        }))
      );

      const row = [
        r._id,
        r.assessmentId?._id || '',
        r.userId?._id || '',
        `"${(r.userId?.name || '').replace(/"/g, '""')}"`,
        r.userId?.email || '',
        r.createdAt ? new Date(r.createdAt).toISOString() : '',

        scores.total ?? '',
        scores.number_sense ?? scores.numberSense ?? '',
        scores.arithmetic ?? '',
        scores.spatial ?? '',
        scores.memory ?? '',

        // ⏱ TIME VALUES
        totalTimeSeconds,
        `"${perQuestionTimeSeconds.replace(/"/g, '""')}"`,

        r.dyscalculiaRiskIndex || '',
        Math.round(r.confidenceScore || 0),
        patterns.numberReversal || 0,
        patterns.symbolConfusion || 0,
        patterns.sequencingError || 0,
        `"${subtypeStr.replace(/"/g, '""')}"`
      ];

      rows.push(row.join(','));
    });

    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    const filename = `assessment_results_${targetUserId}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('exportResultsCSV error:', error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = { startAssessment, submitAssessment, getUserResults, exportResultsCSV };