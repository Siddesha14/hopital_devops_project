/**
 * Rule-based symptom analysis for demo purposes (not medical advice).
 */
const KNOWLEDGE = [
  {
    keywords: ['fever', 'chills', 'temperature'],
    condition: 'Possible viral or bacterial infection',
    severity: 'moderate',
    advice: 'Monitor temperature; seek care if fever persists beyond 48 hours or is very high.',
  },
  {
    keywords: ['chest pain', 'shortness of breath', 'breath'],
    condition: 'Cardiopulmonary concern — needs evaluation',
    severity: 'high',
    advice: 'Seek urgent medical attention if chest pain is severe or breathing is difficult.',
  },
  {
    keywords: ['headache', 'migraine'],
    condition: 'Headache syndrome',
    severity: 'low',
    advice: 'Rest, hydration; see a clinician if sudden severe headache or neurological symptoms.',
  },
  {
    keywords: ['cough', 'sore throat', 'runny nose'],
    condition: 'Upper respiratory symptoms',
    severity: 'low',
    advice: 'Rest and fluids; isolate if COVID-19 suspected; test if indicated.',
  },
  {
    keywords: ['nausea', 'vomiting', 'diarrhea'],
    condition: 'Gastrointestinal upset',
    severity: 'moderate',
    advice: 'Hydration; seek care if vomiting persists or signs of dehydration.',
  },
  {
    keywords: ['rash', 'itching', 'hives'],
    condition: 'Dermatologic reaction',
    severity: 'moderate',
    advice: 'Avoid known triggers; seek care if spreading rapidly or with facial swelling.',
  },
  {
    keywords: ['fatigue', 'tired', 'weakness'],
    condition: 'Non-specific fatigue',
    severity: 'low',
    advice: 'Sleep, nutrition review; persistent fatigue warrants evaluation.',
  },
];

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function diagnose(symptomsText) {
  const text = normalize(symptomsText || '');
  if (!text) {
    return {
      diagnosis: 'Insufficient information',
      severity: 'unknown',
      matchedTopics: [],
      disclaimer:
        'This is a demo simulation only. It is not medical advice. Consult a licensed professional.',
    };
  }

  const matched = [];
  for (const row of KNOWLEDGE) {
    const hits = row.keywords.filter((k) => text.includes(k.toLowerCase()));
    if (hits.length) {
      matched.push({ ...row, matchedKeywords: hits });
    }
  }

  if (matched.length === 0) {
    return {
      diagnosis: 'No specific pattern matched — further clinical assessment recommended',
      severity: 'unknown',
      matchedTopics: [],
      disclaimer:
        'This is a demo simulation only. It is not medical advice. Consult a licensed professional.',
    };
  }

  const severityOrder = { high: 3, moderate: 2, low: 1, unknown: 0 };
  matched.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
  const top = matched[0];

  return {
    diagnosis: top.condition,
    severity: top.severity,
    matchedTopics: matched.map((m) => ({
      condition: m.condition,
      severity: m.severity,
      keywords: m.matchedKeywords,
    })),
    advice: top.advice,
    disclaimer:
      'This is a demo simulation only. It is not medical advice. Consult a licensed professional.',
  };
}

module.exports = { diagnose };
