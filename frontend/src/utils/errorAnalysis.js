// utilities to detect simple error patterns from answers
export function detectErrorPatterns(questions = [], answers = []){
  // questions: array with { questionText, correctAnswer, questionType }
  // answers: array with { selectedAnswer }
  const patterns = { numberReversal: 0, symbolConfusion: 0, sequencingError: 0 }
  for(let i=0;i<Math.min(questions.length, answers.length); i++){
    const q = questions[i]
    const a = answers[i]
    if(!a || !q) continue
    const corr = String(q.correctAnswer ?? '')
    const sel = String(a.selected ?? a.selectedAnswer ?? '')

    // number reversal: if selected is digits reversed e.g. 21 vs 12
    if(corr && sel.length === corr.length && sel.split('').reverse().join('') === corr) patterns.numberReversal++

    // symbol confusion: if question includes symbols and user chose a number instead
    if(/[><=]/.test(String(q.questionText || '')) && /\d/.test(sel) && !/[><=]/.test(sel)) patterns.symbolConfusion++

    // sequencing: memory test wrong by adjacent position (off by one)
    const qt = String(q.questionType || '').toLowerCase()
    const normalizedQt = qt.replace(/_/g, '') // 'number_sense' -> 'numbersense'
    if(normalizedQt.includes('memory')){
      const corrNum = Number(corr)
      const selNum = Number(sel)
      if(!Number.isNaN(corrNum) && !Number.isNaN(selNum) && Math.abs(corrNum - selNum) === 1) patterns.sequencingError++
    }
  }
  return patterns
}

// also provide a default export for consumers that import the module default
export default detectErrorPatterns
